import { API_URL } from './api-config';

const pendingReads = new Map<string, Promise<any>>();
export function request(path: string, method = 'GET', body?: unknown): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('maha_token') : null;
  const key = `${token || 'public'}:${path}`;
  if (method === 'GET') {
    const existing = pendingReads.get(key);
    if (existing) return existing;
    const task = performRequest(path, method, body, token).finally(() => pendingReads.delete(key));
    pendingReads.set(key, task);
    return task;
  }
  return performRequest(path, method, body, token);
}

async function performRequest(path: string, method: string, body: unknown, token: string | null) {
  const response = await fetch(`${API_URL}/api/workspace${path}`, {
    cache: 'no-store',
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    // Let a slow hosted-database transaction finish before the UI times out.
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(method === 'GET' ? 30000 : 90000),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'Request failed. Please try again.');
  return data;
}

export async function launchProfile(profile: { id: string; roles: string[] }) {
  const data = await request('/demo-session', 'POST', { partyId: profile.id });
  localStorage.setItem('maha_token', data.token);
  localStorage.setItem('maha_party', JSON.stringify(data.party));
  localStorage.setItem('maha_demo_role', data.party.roles[0]);
  window.dispatchEvent(new Event('session-change'));
  return destination(data.party.roles[0]);
}

export function destination(role: string) {
  if (role === 'FARMER') return '/farmer/home';
  if (role === 'BUYER') return '/buyer';
  if (role === 'FPO_ADMIN') return '/fpo';
  if (role === 'DISTRICT_ADMIN') return '/district-admin';
  if (role === 'STATE_ADMIN') return '/state-admin';
  if (role === 'PLATFORM_ADMIN') return '/platform-admin';
  return `/provider?role=${role}`;
}

export const resourceLabels: Record<string,string> = {
  CROP_LOT: 'Crop lots', COLD_STORAGE: 'Cold storage', TRANSPORT: 'Transport', EQUIPMENT_SERVICE: 'Equipment rental',
  LABOR: 'Labor crews', USED_EQUIPMENT: 'Used equipment', INPUT_GROUP_BUY: 'Input group buying', CONTRACT_FARMING: 'Contract farming',
};
export const roleLabels: Record<string,string> = {
  FARMER: 'Farmer', FPO_ADMIN: 'FPO aggregator', BUYER: 'Buyer', STORAGE_OPERATOR: 'Storage operator', TRANSPORT_OPERATOR: 'Transport operator',
  EQUIPMENT_PROVIDER: 'Equipment provider', LABOR_CONTRACTOR: 'Labor contractor', INPUT_SUPPLIER: 'Input supplier',
  DISTRICT_ADMIN: 'District administration', STATE_ADMIN: 'State command', PLATFORM_ADMIN: 'Platform administration',
};
export const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
export const label = (s: string) => (s || '').replaceAll('_',' ').toLowerCase().replace(/^./,c => c.toUpperCase());
export const resourceTitle = (item: any) => item.attributes?.crop || item.attributes?.machineType || item.attributes?.vehicleType || item.attributes?.inputType || item.attributes?.taskType || resourceLabels[item.resourceType];

export const resourceFields: Record<string, Array<{ key: string; label: string; type?: string; value: string; options?: string[] }>> = {
  CROP_LOT: [{ key:'crop',label:'Crop',value:'Onion' },{ key:'quantityKg',label:'Quantity (kg)',type:'number',value:'500' },{ key:'qualityGrade',label:'Quality grade',value:'A',options:['A','B','C'] }],
  COLD_STORAGE: [{ key:'capacityQuintal',label:'Capacity (quintals)',type:'number',value:'10' },{ key:'cropSuitability',label:'Suitable crops (comma separated)',value:'Onion, Tomato' },{ key:'tempRange',label:'Temperature range',value:'2–8 °C' }],
  TRANSPORT: [{ key:'vehicleType',label:'Vehicle type',value:'Refrigerated truck' },{ key:'capacityKg',label:'Capacity (kg)',type:'number',value:'3000' },{ key:'from',label:'Route origin',value:'Nashik' },{ key:'to',label:'Route destination',value:'Pune' }],
  EQUIPMENT_SERVICE: [{ key:'machineType',label:'Machine',value:'Tractor' },{ key:'packageType',label:'Service package',value:'Ploughing with operator' },{ key:'includesOperator',label:'Operator included',value:'Yes',options:['Yes','No'] }],
  LABOR: [{ key:'crewSize',label:'Crew size',type:'number',value:'5' },{ key:'taskType',label:'Task',value:'Harvesting' }],
  USED_EQUIPMENT: [{ key:'machineType',label:'Machine / model',value:'Tractor' },{ key:'conditionGrade',label:'Condition',value:'good',options:['like_new','good','fair'] },{ key:'yearOfPurchase',label:'Purchase year',type:'number',value:'2022' }],
  INPUT_GROUP_BUY: [{ key:'inputType',label:'Input product',value:'Certified seeds' },{ key:'targetQuantity',label:'Target quantity (bags)',type:'number',value:'100' }],
  CONTRACT_FARMING: [{ key:'crop',label:'Crop',value:'Onion' },{ key:'agreedPricePerKg',label:'Agreed price / kg',type:'number',value:'20' },{ key:'qualitySpec',label:'Quality specification',value:'Grade A' },{ key:'start',label:'Season start',type:'date',value:'2026-10-01' },{ key:'end',label:'Season end',type:'date',value:'2027-03-31' }],
};
export function attributesFromForm(type: string, form: FormData) {
  const attrs: Record<string,any> = {};
  for (const field of resourceFields[type]) attrs[field.key] = field.type === 'number' ? Number(form.get(field.key)) : String(form.get(field.key));
  if (type === 'COLD_STORAGE') attrs.cropSuitability = attrs.cropSuitability.split(',').map((s:string)=>s.trim()).filter(Boolean);
  if (type === 'TRANSPORT') { attrs.route = { from:attrs.from,to:attrs.to }; delete attrs.from; delete attrs.to; }
  if (type === 'EQUIPMENT_SERVICE') attrs.includesOperator = attrs.includesOperator === 'Yes';
  if (type === 'CONTRACT_FARMING') { attrs.seasonWindow = { start:attrs.start,end:attrs.end }; delete attrs.start; delete attrs.end; }
  return attrs;
}
