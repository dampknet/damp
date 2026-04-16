export async function fetchVrmFuel(vrmId: string) {
  const res = await fetch(`https://vrmapi.victronenergy.com/v2/installations/${vrmId}/stats?type=tank_level`, {
    headers: { 'X-Authorization': `Token ${process.env.VRM_API_TOKEN}` }
  });
  const data = await res.json();
  return data.records[0]?.value || 0; // Return the percentage
}