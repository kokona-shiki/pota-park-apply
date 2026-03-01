import { query, getMany } from '../config/database.js';
import { format, toZonedTime } from 'date-fns-tz';
import { create } from 'xmlbuilder2';
import AdmZip from 'adm-zip';
import { writeToString } from 'fast-csv';
import regionMapping from '../../shared/region.json' with { type: "json" };
import { PARK_TYPE_MAP } from '../../shared/schemas/parkType.js';
import type { ExportAuditLog } from '../../shared/schemas/export.js';

const REGION_BY_ISO = new Map(regionMapping.map((item) => [item.code, item.name]));

const ACCESS_METHODS_MAP: { [key: string]: string } = {
  'Automobile': '汽车',
  'Foot': '步行',
  'Boat': '船只',
  'Seaplane/Airtaxi': '水上飞机/空中出租车',
  'Other': '其他'
};

const ACTIVATION_METHODS_MAP: { [key: string]: string } = {
  'Pedestrian': '步行',
  'Automobile': '车载',
  'Cabin': '固定建筑',
  'Campground': '露营地',
  'Shelter': '庇护所',
  'Other': '其他'
};

const STATUS_MAP: { [key: string]: string } = {
  'pending': '待审核',
  'approved': '已批准',
  'rejected': '已拒绝',
  'pota_synced': '已同步'
};

type ParkExportData = {
  id: number;
  park_name: string;
  latitude: number;
  longitude: number;
  park_type: string | null;
  provinces: string[];
  description: string | null;
  access_methods: string[];
  activation_methods: string[];
  website: string | null;
  applicant_id: number;
  applicant_callsign: string | null;
  applicant_email: string | null;
  created_at: string;
  status: string;
  pota_synced_at: string | null;
  pota_synced_by: number | null;
  pota_synced_by_callsign: string | null;
  pota_id: string | null;
  pota_notes: string | null;
  is_pota_imported: boolean;
};

const formatAccessMethods = (methods: string[]): string => {
  return methods.map(method => {
    const trimmedMethod = method.trim();
    return ACCESS_METHODS_MAP[trimmedMethod] || trimmedMethod;
  }).join(', ');
};

const formatActivationMethods = (methods: string[]): string => {
  return methods.map(method => {
    const trimmedMethod = method.trim();
    return ACTIVATION_METHODS_MAP[trimmedMethod] || trimmedMethod;
  }).join(', ');
};

const formatProvinces = (provinces: string[]): string => {
  return provinces.map(code => {
    const provinceName = REGION_BY_ISO.get(code);
    return provinceName ? `${code} ${provinceName}` : code;
  }).join('; ');
};

const formatTimeToUTC8 = (timeStr: string | null): string | null => {
  if (!timeStr) return null;
  try {
    const date = new Date(timeStr);
    return format(toZonedTime(date, 'Asia/Shanghai'), 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return timeStr;
  }
};

const formatParkType = (parkType: string | null): string => {
  if (!parkType) return '';
  return PARK_TYPE_MAP.get(parkType) || parkType;
};

const getAllParks = async (): Promise<ParkExportData[]> => {
  const parks = await getMany(`
    SELECT 
      pa.id,
      pa.park_name,
      pa.latitude,
      pa.longitude,
      pa.park_type,
      pa.provinces,
      pa.description,
      pa.access_methods,
      pa.activation_methods,
      pa.website,
      pa.applicant_id,
      u.callsign as applicant_callsign,
      u.email as applicant_email,
      pa.created_at,
      pa.status,
      pa.pota_synced_at,
      pa.pota_synced_by,
      u2.callsign as pota_synced_by_callsign,
      pa.pota_id,
      pa.pota_notes,
      EXISTS (
        SELECT 1 FROM application_audit_logs aal
        WHERE aal.application_id = pa.id
        AND aal.action = 'pota_imported'
      ) as is_pota_imported
    FROM park_applications pa
    LEFT JOIN users u ON pa.applicant_id = u.id
    LEFT JOIN users u2 ON pa.pota_synced_by = u2.id
    ORDER BY pa.id ASC
  `) as Array<{
    id: number;
    park_name: string;
    latitude: number;
    longitude: number;
    park_type: string | null;
    provinces: string[] | unknown;
    description: string | null;
    access_methods: string[] | unknown;
    activation_methods: string[] | unknown;
    website: string | null;
    applicant_id: number;
    applicant_callsign: string | null;
    applicant_email: string | null;
    created_at: string;
    status: string;
    pota_synced_at: string | null;
    pota_synced_by: number | null;
    pota_synced_by_callsign: string | null;
    pota_id: string | null;
    pota_notes: string | null;
    is_pota_imported: boolean;
  }>;

  return parks.map(park => ({
    ...park,
    provinces: Array.isArray(park.provinces) ? park.provinces : [],
    access_methods: Array.isArray(park.access_methods) ? park.access_methods : [],
    activation_methods: Array.isArray(park.activation_methods) ? park.activation_methods : []
  }));
};

const recordExportAuditLog = async (
  userId: number,
  fileType: 'csv' | 'kmz',
  parkCount: number
): Promise<void> => {
  await query(`
    INSERT INTO export_audit_logs (file_type, park_count, exported_by, exported_by_callsign)
    SELECT $1, $2, $3, u.callsign
    FROM users u
    WHERE u.id = $3
  `, [fileType, parkCount, userId]);
};

// 转换公园数据为 CSV 格式
const convertToCSVData = (park: ParkExportData) => {
  const basicInfo = getBasicParkInfo(park);
  const locationInfo = getParkLocationInfo(park);
  const applicantInfo = getParkApplicantInfo(park);
  const statusInfo = getParkStatusInfo(park);
  const potaInfo = getParkPotaInfo(park);

  return {
    ...basicInfo,
    ...locationInfo,
    ...applicantInfo,
    ...statusInfo,
    ...potaInfo
  };
};

const getBasicParkInfo = (park: ParkExportData) => {
  return {
    '公园申请 id': park.id,
    '公园名称': park.park_name,
    '公园类型': formatParkType(park.park_type),
    '省份': formatProvinces(park.provinces),
    '公园描述': park.description || '',
    '公园网站': park.website || ''
  };
};

const getParkLocationInfo = (park: ParkExportData) => {
  return {
    '公园经纬度': `${park.latitude},${park.longitude}`,
    '访问方法': formatAccessMethods(park.access_methods),
    '激活方法': formatActivationMethods(park.activation_methods)
  };
};

const getParkApplicantInfo = (park: ParkExportData) => {
  return {
    '公园申请人 id': park.applicant_id,
    '公园申请人呼号': park.applicant_callsign || '',
    '公园申请人邮箱': park.applicant_email || ''
  };
};

const getParkStatusInfo = (park: ParkExportData) => {
  return {
    '公园申请时间': formatTimeToUTC8(park.created_at) || '',
    '公园申请状态': STATUS_MAP[park.status] || park.status
  };
};

const getParkPotaInfo = (park: ParkExportData) => {
  return {
    '同步到 POTA 的时间': formatTimeToUTC8(park.pota_synced_at) || '',
    '同步到 POTA 的操作员 ID': park.pota_synced_by || '',
    '同步到 POTA 的操作员呼号': park.pota_synced_by_callsign || '',
    '是否从 POTA 导入': park.is_pota_imported ? '是' : '否',
    'POTA 公园 ID': park.pota_id || '',
    'POTA 备注': park.pota_notes || ''
  };
};

// 添加公园数据到 KML
interface XmlBuilderElement {
  ele: (name: string, attributes?: Record<string, string>) => XmlBuilderElement;
  txt: (text: string) => XmlBuilderElement;
}

const addParkToKML = (folder: XmlBuilderElement, park: ParkExportData) => {
  const placemark = folder.ele('Placemark');
  placemark.ele('name').txt(park.park_name);
  placemark.ele('Point').ele('coordinates').txt(`${park.longitude},${park.latitude},0`);

  const extendedData = placemark.ele('ExtendedData');
  addBasicInfoToKML(extendedData, park);
  addLocationInfoToKML(extendedData, park);
  addApplicantInfoToKML(extendedData, park);
  addStatusInfoToKML(extendedData, park);
  addPotaInfoToKML(extendedData, park);
};

const addBasicInfoToKML = (extendedData: XmlBuilderElement, park: ParkExportData) => {
  extendedData.ele('Data', { name: 'parkId' }).txt(park.id.toString());
  extendedData.ele('Data', { name: 'parkName' }).txt(park.park_name);
  extendedData.ele('Data', { name: 'parkType' }).txt(formatParkType(park.park_type));
  extendedData.ele('Data', { name: 'province' }).txt(formatProvinces(park.provinces));
  extendedData.ele('Data', { name: 'description' }).txt(park.description || '');
  extendedData.ele('Data', { name: 'website' }).txt(park.website || '');
};

const addLocationInfoToKML = (extendedData: XmlBuilderElement, park: ParkExportData) => {
  extendedData.ele('Data', { name: 'coordinates' }).txt(`${park.latitude},${park.longitude}`);
  extendedData.ele('Data', { name: 'accessMethods' }).txt(formatAccessMethods(park.access_methods));
  extendedData.ele('Data', { name: 'activationMethods' }).txt(formatActivationMethods(park.activation_methods));
};

const addApplicantInfoToKML = (extendedData: XmlBuilderElement, park: ParkExportData) => {
  extendedData.ele('Data', { name: 'applicantId' }).txt(park.applicant_id.toString());
  extendedData.ele('Data', { name: 'applicantCallsign' }).txt(park.applicant_callsign || '');
  extendedData.ele('Data', { name: 'applicantEmail' }).txt(park.applicant_email || '');
};

const addStatusInfoToKML = (extendedData: XmlBuilderElement, park: ParkExportData) => {
  extendedData.ele('Data', { name: 'createdAt' }).txt(formatTimeToUTC8(park.created_at) || '');
  extendedData.ele('Data', { name: 'status' }).txt(STATUS_MAP[park.status] || park.status);
};

const addPotaInfoToKML = (extendedData: XmlBuilderElement, park: ParkExportData) => {
  extendedData.ele('Data', { name: 'potaSyncedAt' }).txt(formatTimeToUTC8(park.pota_synced_at) || '');
  extendedData.ele('Data', { name: 'potaSyncedById' }).txt(park.pota_synced_by?.toString() || '');
  extendedData.ele('Data', { name: 'potaSyncedByCallsign' }).txt(park.pota_synced_by_callsign || '');
  extendedData.ele('Data', { name: 'isPotaImported' }).txt(park.is_pota_imported ? '是' : '否');
  extendedData.ele('Data', { name: 'potaId' }).txt(park.pota_id || '');
  extendedData.ele('Data', { name: 'potaNotes' }).txt(park.pota_notes || '');
};

export const exportToCSV = async (userId: number): Promise<Buffer> => {
  const parks = await getAllParks();
  
  const csvData = parks.map(convertToCSVData);

  const csvString = await writeToString(csvData, { headers: true });
  await recordExportAuditLog(userId, 'csv', parks.length);

  return Buffer.from(csvString, 'utf8');
};

export const exportToKMZ = async (userId: number): Promise<Buffer> => {
  const parks = await getAllParks();

  const kml = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('kml', { xmlns: 'http://www.opengis.net/kml/2.2' });

  const document = kml.ele('Document');
  const folder = document.ele('Folder', { name: 'POTA 公园数据' });

  parks.forEach(park => addParkToKML(folder, park));

  const xmlString = kml.end({ format: 'xml', prettyPrint: true }) as string;
  await recordExportAuditLog(userId, 'kmz', parks.length);

  const zip = new AdmZip();
  zip.addFile('doc.kml', Buffer.from(xmlString, 'utf8'));
  const kmzBuffer = await zip.toBuffer();

  return kmzBuffer;
};

export const getExportAuditLogs = async (): Promise<ExportAuditLog[]> => {
  const logs = await getMany(`
    SELECT 
      eal.id,
      eal.file_type,
      eal.park_count,
      eal.exported_by_callsign,
      eal.created_at
    FROM export_audit_logs eal
    ORDER BY eal.created_at DESC
    LIMIT 100
  `) as Array<{
    id: number;
    file_type: "csv" | "kmz";
    park_count: number;
    exported_by_callsign: string;
    created_at: string;
  }>;

  return logs.map(log => ({
    ...log,
    created_at: formatTimeToUTC8(log.created_at) || log.created_at
  }));
};
