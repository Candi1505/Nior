/* ============================================================
   CHEST COMPANION V2 — PREDICTOR WORKBOOK IMPORTER
   Built by Cherubim

   Reads:
   - CSV
   - XLSX
   - XLSM

   This first importer validates and inspects the workbook
   before the sequence parser activates it.
   ============================================================ */

(function initialisePredictorUpload(window) {
  "use strict";

  function getElements(chestType) {
    const prefix =
      chestType === "gold"
        ? "gold"
        : "platinum";

    return {
      fileInput: document.getElementById(
        `${prefix}PredictorFile`
      ),

      uploadButton: document.getElementById(
        chestType === "gold"
          ? "uploadGoldPredictorButton"
          : "uploadPlatinumPredictorButton"
      ),

      status: document.getElementById(
        `${prefix}PredictorStatus`
      )
    };
  }

  function setStatus(
    chestType,
    message,
    type = "normal"
  ) {
    const { status } =
      getElements(chestType);

    if (!status) {
      return;
    }

    status.textContent = message;

    status.style.color =
      type === "error"
        ? "#ff9cb9"
        : type === "success"
          ? "#65e2b4"
          : "";
  }

  function normaliseExtension(fileName) {
    const parts = String(fileName || "")
      .toLowerCase()
      .split(".");

    return parts.length > 1
      ? parts.pop()
      : "";
  }

  function validateFile(file) {
    if (!file) {
      throw new Error(
        "Choose a predictor spreadsheet first."
      );
    }

    const extension =
      normaliseExtension(file.name);

    const allowed = [
      "csv",
      "xlsx",
      "xlsm"
    ];

    if (!allowed.includes(extension)) {
      throw new Error(
        "Please choose a CSV, XLSX or XLSM file."
      );
    }

    return extension;
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.addEventListener(
          "load",
          () => resolve(reader.result)
        );

        reader.addEventListener(
          "error",
          () => reject(
            new Error(
              "The spreadsheet could not be read."
            )
          )
        );

        reader.readAsArrayBuffer(file);
      }
    );
  }

  function getSheetPreview(
    workbook,
    sheetName
  ) {
    const worksheet =
      workbook.Sheets[sheetName];

    if (!worksheet) {
      return {
        sheetName,
        rows: [],
        rowCount: 0,
        columnCount: 0
      };
    }

    const rows =
      window.XLSX.utils.sheet_to_json(
        worksheet,
        {
          header: 1,
          raw: false,
          defval: ""
        }
      );

    const columnCount =
      rows.reduce(
        (maximum, row) =>
          Math.max(
            maximum,
            Array.isArray(row)
              ? row.length
              : 0
          ),
        0
      );

    return {
      sheetName,
      rows,
      rowCount: rows.length,
      columnCount
    };
  }

  function inspectWorkbook(
    workbook,
    chestType,
    file
  ) {
    const sheetNames =
      workbook.SheetNames || [];

    if (!sheetNames.length) {
      throw new Error(
        "The workbook does not contain any worksheets."
      );
    }

    const sheets = sheetNames.map(
      sheetName =>
        getSheetPreview(
          workbook,
          sheetName
        )
    );

    const populatedSheets =
      sheets.filter(sheet =>
        sheet.rows.some(row =>
          row.some(cell =>
            String(cell || "").trim()
          )
        )
      );

    if (!populatedSheets.length) {
      throw new Error(
        "No predictor data was found in the workbook."
      );
    }

    const totalRows =
      populatedSheets.reduce(
        (total, sheet) =>
          total + sheet.rowCount,
        0
      );

    return {
      chestType,
      fileName: file.name,
      fileSize: file.size,
      importedAt:
        new Date().toISOString(),
      sheetNames,
      sheets: populatedSheets,
      totalRows
    };
  }

  async function processWorkbook(
    chestType
  ) {
    const {
      fileInput,
      uploadButton
    } = getElements(chestType);

    if (!fileInput || !uploadButton) {
      console.error(
        `[Chest Companion] ${chestType} upload controls were not found.`
      );

      return;
    }

    const file =
      fileInput.files?.[0];

    try {
      validateFile(file);

      if (!window.XLSX) {
        throw new Error(
          "The spreadsheet reader did not load. Refresh the app and try again."
        );
      }

      uploadButton.disabled = true;

      setStatus(
        chestType,
        "Reading spreadsheet..."
      );

      const arrayBuffer =
        await readFileAsArrayBuffer(file);

      const workbook =
        window.XLSX.read(
          arrayBuffer,
          {
            type: "array",
            cellDates: true,
            cellFormula: true
          }
        );

      setStatus(
        chestType,
        "Inspecting workbook structure..."
      );

      const inspection =
        inspectWorkbook(
          workbook,
          chestType,
          file
        );

      /*
       * Keep the inspected workbook available for
       * the sequence parser and testing.
       */
      window.ChestPredictorImports =
        window.ChestPredictorImports || {};

      window.ChestPredictorImports[
        chestType
      ] = inspection;

      localStorage.setItem(
        `chestPredictorImport:${chestType}`,
        JSON.stringify({
          chestType:
            inspection.chestType,

          fileName:
            inspection.fileName,

          importedAt:
            inspection.importedAt,

          sheetNames:
            inspection.sheetNames,

          totalRows:
            inspection.totalRows
        })
      );

      const sheetDescription =
        inspection.sheetNames
          .slice(0, 4)
          .join(", ");

      const additionalSheets =
        inspection.sheetNames.length > 4
          ? ` and ${
              inspection.sheetNames.length - 4
            } more`
          : "";

      setStatus(
        chestType,
        `✓ ${file.name} read successfully. ` +
        `${inspection.sheetNames.length} sheet${
          inspection.sheetNames.length === 1
            ? ""
            : "s"
        } found: ${sheetDescription}${additionalSheets}.`,
        "success"
      );

      console.info(
        `[Chest Companion] ${chestType} workbook inspected.`,
        inspection
      );

      window.dispatchEvent(
        new CustomEvent(
          "chest-companion-workbook-imported",
          {
            detail: inspection
          }
        )
      );
    } catch (error) {
      console.error(
        `[Chest Companion] ${chestType} workbook import failed.`,
        error
      );

      setStatus(
        chestType,
        error?.message ||
          "The spreadsheet could not be imported.",
        "error"
      );
    } finally {
      uploadButton.disabled = false;
    }
  }

  function attachUploadControls(
    chestType
  ) {
    const {
      fileInput,
      uploadButton
    } = getElements(chestType);

    if (!fileInput || !uploadButton) {
      return;
    }

    if (
      uploadButton.dataset
        .predictorUploadBound === "true"
    ) {
      return;
    }

    uploadButton.dataset
      .predictorUploadBound = "true";

    uploadButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        processWorkbook(chestType);
      }
    );

    fileInput.addEventListener(
      "change",
      () => {
        const file =
          fileInput.files?.[0];

        if (!file) {
          setStatus(
            chestType,
            "No upload yet."
          );

          return;
        }

        setStatus(
          chestType,
          `${file.name} selected. Tap Upload Sequence.`
        );
      }
    );
  }

  function initialise() {
    attachUploadControls("gold");
    attachUploadControls("platinum");

    console.info(
      "[Chest Companion] Predictor upload controls ready."
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialise
    );
  } else {
    initialise();
  }

  window.ChestPredictorUpload =
    Object.freeze({
      processGold: () =>
        processWorkbook("gold"),

      processPlatinum: () =>
        processWorkbook("platinum")
    });
})(window);