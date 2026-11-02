function TableView({ data }) {
  return (
    <details className="table-view">
      <summary>View as table</summary>
      <table>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.tooltip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function Columns({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.findIndex((d) => d.value === max);

  return (
    <figure className="chart">
      <div className="columns">
        {data.map((d, i) => (
          <div key={d.label} className="column" tabIndex={0} aria-label={`${d.label}: ${d.tooltip}`}>
            <div className="column-plot">
              <div className="column-bar" style={{ height: `${(d.value / max) * 100}%` }}>
                {i === peak && <span className="cap-label">{d.value}</span>}
              </div>
            </div>
            <span className="axis-label">{d.label}</span>
            <span className="tooltip">{d.tooltip}</span>
          </div>
        ))}
      </div>
      <TableView data={data} />
    </figure>
  );
}

export function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <figure className="chart">
      <ul className="bars">
        {data.map((d) => (
          <li key={d.label} className="bar-row" tabIndex={0} aria-label={`${d.label}: ${d.tooltip}`}>
            <span className="bar-label">{d.label}</span>
            <span className="bar-track">
              <span className="bar" style={{ width: `${(d.value / max) * 100}%` }} />
            </span>
            <span className="bar-value">{d.value}</span>
            <span className="tooltip">{d.tooltip}</span>
          </li>
        ))}
      </ul>
      <TableView data={data} />
    </figure>
  );
}
