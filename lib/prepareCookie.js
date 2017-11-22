module.exports = function(data) {
  return data.map(c => `${c.name}|${c.type}|${c.timestamp}`).join(',');
}
