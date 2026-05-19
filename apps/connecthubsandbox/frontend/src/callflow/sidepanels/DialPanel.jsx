export default function DialPanel({ rule, onRuleChange }) {
  const updateRule = updates => onRuleChange({ ...rule, ...updates });
  return (
    <section className="panel-section">
      <div className="section-header">Dial</div>
      <label>Dial Label</label>
      <input
        type="text"
        placeholder="Enter dial text"
        value={rule.dialText || ''}
        onChange={e => updateRule({ dialText: e.target.value })}
      />
    </section>
  );
}