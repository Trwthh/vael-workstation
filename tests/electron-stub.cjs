// Stands in for `electron` so AgentRunner can run under plain Node in tests.
module.exports = {
  app: { getPath: () => process.env.VAEL_TEST_DATA },
  BrowserWindow: class {},
}
