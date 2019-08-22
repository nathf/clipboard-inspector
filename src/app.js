import ReactDOM from "react-dom";
import React, { useEffect, useState } from "react";
import prettier from "prettier/standalone";
import parserHtml from "prettier/parser-html";

function file_info(file) {
  return file
    ? {
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      }
    : null;
}

function format(input) {
  try {
    return prettier.format(input || "", {
      parser: "html",
      plugins: [parserHtml]
    });
  } catch (e) {
    console.error(e);
    return input;
  }
}

function copyToClipboard(data) {
  // chrome can throw an exception if the document isnt focused
  // while trying to programmatically copy
  document.body.focus();
  let writePromise;
  if (typeof data === "string") {
    writePromise = navigator.clipboard.writeText(data);
  } else {
    writePromise = navigator.clipboard.write(data);
  }

  writePromise.then(
    function() {
      console.log("copied");
    },
    function(e) {
      console.error("failed to copy", e.message);
    }
  );
}

function prevent(e) {
  e.preventDefault();
}

function processEvent(dataTransfer) {
  return {
    data_by_type: Array.from(dataTransfer.types).map(type => {
      let data = dataTransfer.getData(type);
      return {
        type,
        data,
        formattedData: format(data)
      };
    }),
    items: dataTransfer.items
      ? Array.from(dataTransfer.items).map(item => {
          return {
            kind: item.kind,
            type: item.type,
            as_file: file_info(item.getAsFile())
          };
        })
      : null,
    files: dataTransfer.files
      ? Array.from(dataTransfer.files).map(file => file_info(file))
      : null
  };
}

function ClipboardInspectorr() {
  const [clipboardData, setClipboardData] = useState(null);

  useEffect(() => {
    function handlePaste(e) {
      e.preventDefault();
      setClipboardData({
        summary: processEvent(e.clipboardData),
        label: "clipboardData"
      });
    }

    function handleDrop(e) {
      e.preventDefault();
      setClipboardData({
        summary: processEvent(e.dataTransfer),
        label: "dataTransfer"
      });
    }

    document.addEventListener("paste", handlePaste);
    document.addEventListener("dragover", prevent);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("dragover", prevent);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  return clipboardData ? (
    <ClipboardSummary {...clipboardData} />
  ) : (
    <div className="intro-msg">
      Paste (<kbd>Ctrl+V</kbd>, <kbd>⌘V</kbd>) or <kbd>drop↓</kbd> something
      here.
    </div>
  );
}

function ClipboardSummary({ summary, label }) {
  const [formatByType, setFormatByType] = useState(false);

  let originalClipboardTransfer = new DataTransfer();
  summary.data_by_type.forEach(obj =>
    originalClipboardTransfer.items.add(obj.type, obj.data)
  );

  return (
    <div className="clipboard-summary">
      <div className="warning">
        <p>
          <strong>Note:</strong> using{" "}
          <code
            style={{
              background: "#ececec",
              padding: "2px 3px",
              borderRadius: "3px"
            }}
          >
            Copy raw data
          </code>{" "}
          will override your clipboard contents
        </p>
        <p>
          {/* 
					Can't seem to get the clipboard API to write a data transfer
					<button
            onClick={() => {
              copyToClipboard(originalClipboardTransfer);
            }}
          >
            Restore clipboard contents
          </button> */}
        </p>
      </div>
      <h1>
        <a
          className="mdn"
          href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer"
        >
          event.{label}
        </a>{" "}
        contains:
      </h1>

      <div className="clipboard-section">
        <h2>
          <a
            className="mdn"
            href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types"
          >
            .types
          </a>
          <span className="anno">
            {summary.data_by_type.length} type(s) available
          </span>
        </h2>
        <table>
          <thead>
            <tr>
              <th>type</th>
              <th>
                <a
                  className="mdn"
                  href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/getData"
                >
                  getData(type)
                </a>
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.data_by_type.map((obj, idx) => (
              <tr key={idx}>
                <td>
                  <code>{obj.type}</code>
                  {obj.type === "text/html" && (
                    <div>
                      <button
                        className="action-button"
                        onClick={() => {
                          setFormatByType({
                            [obj.type]: !formatByType[obj.type]
                          });
                        }}
                      >
                        {formatByType[obj.type] ? "Minify" : "Pretty print"}
                      </button>
                    </div>
                  )}
                  <div>
                    <button
                      className="action-button"
                      onClick={() =>
                        copyToClipboard(
                          formatByType[obj.type] ? obj.formattedData : obj.data
                        )
                      }
                    >
                      Copy raw data
                    </button>
                  </div>
                </td>
                <td>
                  <pre>
                    <code>
                      {formatByType[obj.type]
                        ? obj.formattedData
                        : obj.data || <em>Empty string</em>}
                    </code>
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="clipboard-section">
        <h2>
          <a
            className="mdn"
            href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/items"
          >
            .items
          </a>
          <span className="anno">
            {summary.items ? (
              `${summary.items.length} item(s) available`
            ) : (
              <em>Undefined</em>
            )}
          </span>
        </h2>

        {summary.items ? (
          <table>
            <thead>
              <tr>
                <th>kind</th>
                <th>type</th>
                <th>
                  <a
                    className="mdn"
                    href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/getAsFile"
                  >
                    getAsFile()
                  </a>
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <code>{item.kind}</code>
                  </td>
                  <td>
                    <code>{item.type}</code>
                  </td>
                  <td>
                    <File file={item.as_file} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="clipboard-section">
        <h2>
          <a
            className="mdn"
            href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files"
          >
            .files
          </a>
          <span className="anno">
            {summary.files
              ? `${summary.files.length} file(s) available`
              : "<em>Undefined</em>"}
          </span>
        </h2>
        {summary.files ? (
          summary.files.map((file, idx) => <File key={idx} file={file} />)
        ) : (
          <span>N/A</span>
        )}
      </div>
    </div>
  );
}

function File({ file }) {
  return file ? (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Size</th>
          <th>Type</th>
          <th>
            <a
              className="mdn"
              href="https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL"
            >
              URL.createObjectURL(file)
            </a>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <code>{file.name}</code>
          </td>
          <td>
            <code>{file.size}</code>
          </td>
          <td>
            <code>{file.type}</code>
          </td>
          <td>
            <code>
              <a href={file.url}>
                <img src={file.url} />
              </a>
            </code>
          </td>
        </tr>
      </tbody>
    </table>
  ) : (
    <em>N/A</em>
  );
}

ReactDOM.render(<ClipboardInspectorr />, document.getElementById("app"));
