export default function QueuePanel({ rule, onRuleChange }) {
  const updateRule = updates => onRuleChange({ ...rule, ...updates });
  return (
    <section className="panel-section">
      <div className="section-header">Queue</div>
      <label>Queue Name</label>
      <input
        type="text"
        placeholder="Enter queue name"
        value={rule.queueName || ''}
        onChange={e => updateRule({ queueName: e.target.value })}
      />
    </section>
  );
}