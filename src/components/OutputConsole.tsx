import { useOutput, useStep2, useStep3, useStep4 } from '../store';

function Table({ rows }: { rows: Array<Record<string, any>> }) {
  if (!rows?.length) return null;
  const cols = Object.keys(rows[0]);
  return (
    <div className="console-table">
      <table>
        <thead>
          <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => <td key={c}>{String(r[c] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Step2Preview() {
  const { orderedPreview, step2Log } = useStep2();
  
  if (!step2Log.length && !orderedPreview) return null;
  
  return (
    <div className="step2-output">
      <h4>Step 2 – WPS Results</h4>
      {step2Log.length > 0 && (
        <pre className="console-log">{step2Log.join('\n')}</pre>
      )}
      {orderedPreview && orderedPreview.length > 0 && (
        <>
          <h5>Preview (first 10)</h5>
          <div className="console-table">
            <table>
              <thead>
                <tr>
                  <th>sequence</th>
                  <th>id</th>
                  <th>lat</th>
                  <th>lng</th>
                  <th>service_s</th>
                </tr>
              </thead>
              <tbody>
                {orderedPreview.map((via, i) => (
                  <tr key={i}>
                    <td>{via.sequence}</td>
                    <td>{via.id}</td>
                    <td>{via.lat}</td>
                    <td>{via.lng}</td>
                    <td>{via.service_s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Step3Preview() {
  const { routingArtifact, step3Log } = useStep3();
  
  if (!step3Log.length && !routingArtifact) return null;
  
  return (
    <div className="step3-output">
      <h4>Step 3 – Routing Results</h4>
      {step3Log.length > 0 && (
        <pre className="console-log">{step3Log.join('\n')}</pre>
      )}
      {routingArtifact && (
        <div className="routing-summary">
          <h5>Routing Summary</h5>
          <div className="summary-grid">
            <div>Vias: {routingArtifact.via_count}</div>
            <div>Distance: {(routingArtifact.totals.length_m / 1000).toFixed(1)} km</div>
            <div>Duration: {Math.round(routingArtifact.totals.duration_s / 60)} min</div>
            <div>Sections: {routingArtifact.section_polylines.length}</div>
            {routingArtifact.section_notices.length > 0 && (
              <div>Notices: {routingArtifact.section_notices.length} sections</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Step4Preview() {
  const { step4Log } = useStep4();
  
  if (!step4Log.length) return null;
  
  return (
    <div className="step4-output">
      <h4>Step 4 – Map Results</h4>
      {step4Log.length > 0 && (
        <pre className="console-log">{step4Log.join('\n')}</pre>
      )}
    </div>
  );
}

export default function OutputConsole() {
  const step1 = useOutput((s) => s.step1);

  return (
    <aside className="output-console" aria-label="Process output">
      <div className="console-header">Output</div>
      <div className="console-body">
        {!step1 && <div className="console-empty">Run Step 1 to see results here.</div>}
        {step1 && (
          <>
            <div className="step1-output">
              <h4>Step 1 – CSV Processing</h4>
              <pre className="console-log">
                {step1.summaryLines.join('\n')}
              </pre>
              <div className="console-actions">
                {step1.stopsFilteredCsv && (
                  <a className="btn" href={step1.stopsFilteredCsv} download="stops_filtered.csv">
                    ⬇️ Download stops_filtered.csv
                  </a>
                )}
                {step1.ingestionConfigJson && (
                  <a className="btn" href={step1.ingestionConfigJson} download="ingestion_config.json">
                    ⬇️ Download ingestion_config.json
                  </a>
                )}
              </div>
              <h5>Preview (first 10 rows)</h5>
              <Table rows={step1.preview} />
            </div>
            <Step2Preview />
            <Step3Preview />
            <Step4Preview />
          </>
        )}
      </div>
    </aside>
  );
}
