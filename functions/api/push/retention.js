export async function runRetention(
  env,
  now = Math.floor(Date.now() / 1000),
) {
  const deliveryCutoff = now - 30 * 86_400;
  const deviceCutoff = now - 180 * 86_400;
  const results = await env.PUSH_DB.batch([
    env.PUSH_DB.prepare(
      "DELETE FROM push_deliveries WHERE updated_at < ?",
    ).bind(deliveryCutoff),
    env.PUSH_DB.prepare(
      `DELETE FROM push_devices
       WHERE updated_at < ?
         AND (last_apns_success_at IS NULL OR last_apns_success_at < ?)`,
    ).bind(deviceCutoff, deviceCutoff),
  ]);
  return {
    deliveriesRemoved: Number(results[0].meta.changes ?? 0),
    devicesRemoved: Number(results[1].meta.changes ?? 0),
  };
}
