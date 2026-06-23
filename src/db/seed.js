const SEED_VERSION = 'guizhou-main-subtask-v1'

// ==================== 贵州省区域数据 ====================
const AREA_DATA = [
  { code: '520000', name: '贵州省', level: 1, parentCode: null, sortOrder: 0 },
  { code: '520100', name: '贵阳市', level: 2, parentCode: '520000', sortOrder: 1 },
  { code: '520200', name: '六盘水市', level: 2, parentCode: '520000', sortOrder: 2 },
  { code: '520300', name: '遵义市', level: 2, parentCode: '520000', sortOrder: 3 },
  { code: '520400', name: '安顺市', level: 2, parentCode: '520000', sortOrder: 4 },
  { code: '520500', name: '毕节市', level: 2, parentCode: '520000', sortOrder: 5 },
  { code: '520600', name: '铜仁市', level: 2, parentCode: '520000', sortOrder: 6 },
  { code: '522300', name: '黔西南布依族苗族自治州', level: 2, parentCode: '520000', sortOrder: 7 },
  { code: '522600', name: '黔东南苗族侗族自治州', level: 2, parentCode: '520000', sortOrder: 8 },
  { code: '522700', name: '黔南布依族苗族自治州', level: 2, parentCode: '520000', sortOrder: 9 },
  { code: '520102', name: '南明区', level: 3, parentCode: '520100', sortOrder: 1 },
  { code: '520103', name: '云岩区', level: 3, parentCode: '520100', sortOrder: 2 },
  { code: '520111', name: '花溪区', level: 3, parentCode: '520100', sortOrder: 3 },
  { code: '520115', name: '观山湖区', level: 3, parentCode: '520100', sortOrder: 4 },
  { code: '520181', name: '清镇市', level: 3, parentCode: '520100', sortOrder: 5 },
  { code: '520201', name: '钟山区', level: 3, parentCode: '520200', sortOrder: 1 },
  { code: '520203', name: '六枝特区', level: 3, parentCode: '520200', sortOrder: 2 },
  { code: '520281', name: '盘州市', level: 3, parentCode: '520200', sortOrder: 3 },
  { code: '520302', name: '红花岗区', level: 3, parentCode: '520300', sortOrder: 1 },
  { code: '520303', name: '汇川区', level: 3, parentCode: '520300', sortOrder: 2 },
  { code: '520304', name: '播州区', level: 3, parentCode: '520300', sortOrder: 3 },
  { code: '520324', name: '正安县', level: 3, parentCode: '520300', sortOrder: 4 },
  { code: '520382', name: '仁怀市', level: 3, parentCode: '520300', sortOrder: 5 },
  { code: '520402', name: '西秀区', level: 3, parentCode: '520400', sortOrder: 1 },
  { code: '520403', name: '平坝区', level: 3, parentCode: '520400', sortOrder: 2 },
  { code: '520423', name: '镇宁布依族苗族自治县', level: 3, parentCode: '520400', sortOrder: 3 },
  { code: '520502', name: '七星关区', level: 3, parentCode: '520500', sortOrder: 1 },
  { code: '520523', name: '金沙县', level: 3, parentCode: '520500', sortOrder: 2 },
  { code: '520526', name: '威宁彝族回族苗族自治县', level: 3, parentCode: '520500', sortOrder: 3 },
  { code: '520602', name: '碧江区', level: 3, parentCode: '520600', sortOrder: 1 },
  { code: '520603', name: '万山区', level: 3, parentCode: '520600', sortOrder: 2 },
  { code: '520628', name: '松桃苗族自治县', level: 3, parentCode: '520600', sortOrder: 3 },
  { code: '522301', name: '兴义市', level: 3, parentCode: '522300', sortOrder: 1 },
  { code: '522302', name: '兴仁市', level: 3, parentCode: '522300', sortOrder: 2 },
  { code: '522326', name: '望谟县', level: 3, parentCode: '522300', sortOrder: 3 },
  { code: '522601', name: '凯里市', level: 3, parentCode: '522600', sortOrder: 1 },
  { code: '522622', name: '黄平县', level: 3, parentCode: '522600', sortOrder: 2 },
  { code: '522631', name: '黎平县', level: 3, parentCode: '522600', sortOrder: 3 },
  { code: '522701', name: '都匀市', level: 3, parentCode: '522700', sortOrder: 1 },
  { code: '522702', name: '福泉市', level: 3, parentCode: '522700', sortOrder: 2 },
  { code: '522730', name: '龙里县', level: 3, parentCode: '522700', sortOrder: 3 },
]

const CITY_META = [
  { cityCode: '520100', counties: ['520102', '520103', '520111', '520115', '520181'], count: 78, lngBase: 106.71, latBase: 26.58 },
  { cityCode: '520200', counties: ['520201', '520203', '520281'], count: 18, lngBase: 104.83, latBase: 26.59 },
  { cityCode: '520300', counties: ['520302', '520303', '520304', '520324', '520382'], count: 46, lngBase: 106.93, latBase: 27.73 },
  { cityCode: '520400', counties: ['520402', '520403', '520423'], count: 24, lngBase: 105.95, latBase: 26.25 },
  { cityCode: '520500', counties: ['520502', '520523', '520526'], count: 20, lngBase: 105.29, latBase: 27.30 },
  { cityCode: '520600', counties: ['520602', '520603', '520628'], count: 18, lngBase: 109.19, latBase: 27.72 },
  { cityCode: '522300', counties: ['522301', '522302', '522326'], count: 18, lngBase: 104.90, latBase: 25.09 },
  { cityCode: '522600', counties: ['522601', '522622', '522631'], count: 30, lngBase: 107.98, latBase: 26.58 },
  { cityCode: '522700', counties: ['522701', '522702', '522730'], count: 24, lngBase: 107.52, latBase: 26.26 },
]

function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function areaName(code) {
  return AREA_DATA.find(a => a.code === code)?.name || code
}

function generateCreditCode(rand) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = '9152'
  for (let i = 0; i < 14; i++) code += chars[Math.floor(rand() * chars.length)]
  return code
}

async function generateUsers() {
  const passwordHash = await sha256('admin123')
  const now = new Date().toISOString()
  return [
    { id: 1, username: 'admin', password: passwordHash, realName: '超级管理员', phone: '13885000001', role: 'super_admin', areaCode: '520000', areaName: '贵州省', status: 'active', createdBy: null, createdAt: now, updatedAt: now },
    { id: 2, username: 'prov_admin', password: passwordHash, realName: '黔省管理员', phone: '13885000002', role: 'provincial_admin', areaCode: '520000', areaName: '贵州省', status: 'active', createdBy: 1, createdAt: now, updatedAt: now },
    { id: 3, username: 'gy_admin', password: passwordHash, realName: '贵阳管理员', phone: '13885000003', role: 'city_admin', areaCode: '520100', areaName: '贵阳市', status: 'active', createdBy: 2, createdAt: now, updatedAt: now },
    { id: 4, username: 'zy_admin', password: passwordHash, realName: '遵义管理员', phone: '13885000004', role: 'city_admin', areaCode: '520300', areaName: '遵义市', status: 'active', createdBy: 2, createdAt: now, updatedAt: now },
    { id: 5, username: 'as_admin', password: passwordHash, realName: '安顺管理员', phone: '13885000005', role: 'city_admin', areaCode: '520400', areaName: '安顺市', status: 'active', createdBy: 2, createdAt: now, updatedAt: now },
    { id: 6, username: 'qd_admin', password: passwordHash, realName: '黔东南管理员', phone: '13885000006', role: 'city_admin', areaCode: '522600', areaName: '黔东南苗族侗族自治州', status: 'active', createdBy: 2, createdAt: now, updatedAt: now },
    { id: 7, username: 'nh_admin', password: passwordHash, realName: '南明管理员', phone: '13885000007', role: 'county_admin', areaCode: '520102', areaName: '南明区', status: 'active', createdBy: 3, createdAt: now, updatedAt: now },
    { id: 8, username: 'hx_admin', password: passwordHash, realName: '花溪管理员', phone: '13885000008', role: 'county_admin', areaCode: '520111', areaName: '花溪区', status: 'active', createdBy: 3, createdAt: now, updatedAt: now },
    { id: 9, username: 'hhg_admin', password: passwordHash, realName: '红花岗管理员', phone: '13885000009', role: 'county_admin', areaCode: '520302', areaName: '红花岗区', status: 'active', createdBy: 4, createdAt: now, updatedAt: now },
    { id: 10, username: 'kl_admin', password: passwordHash, realName: '凯里管理员', phone: '13885000010', role: 'county_admin', areaCode: '522601', areaName: '凯里市', status: 'active', createdBy: 6, createdAt: now, updatedAt: now },
    { id: 11, username: 'enum01', password: passwordHash, realName: '普查员甲', phone: '13885000011', role: 'enumerator', areaCode: '520102', areaName: '南明区', status: 'active', createdBy: 7, createdAt: now, updatedAt: now },
    { id: 12, username: 'enum02', password: passwordHash, realName: '普查员乙', phone: '13885000012', role: 'enumerator', areaCode: '520111', areaName: '花溪区', status: 'active', createdBy: 8, createdAt: now, updatedAt: now },
    { id: 13, username: 'enum03', password: passwordHash, realName: '普查员丙', phone: '13885000013', role: 'enumerator', areaCode: '520302', areaName: '红花岗区', status: 'active', createdBy: 9, createdAt: now, updatedAt: now },
    { id: 14, username: 'enum04', password: passwordHash, realName: '普查员丁', phone: '13885000014', role: 'enumerator', areaCode: '522601', areaName: '凯里市', status: 'active', createdBy: 10, createdAt: now, updatedAt: now },
    { id: 15, username: 'rev01', password: passwordHash, realName: '省级审核员', phone: '13885000015', role: 'reviewer', areaCode: '520000', areaName: '贵州省', status: 'active', createdBy: 2, createdAt: now, updatedAt: now },
    { id: 16, username: 'rev02', password: passwordHash, realName: '贵阳审核员', phone: '13885000016', role: 'reviewer', areaCode: '520100', areaName: '贵阳市', status: 'active', createdBy: 3, createdAt: now, updatedAt: now },
  ]
}

function generateAccommodations() {
  const rand = seededRandom(52)
  const now = new Date().toISOString()
  const prefixes = ['甲秀', '黔灵', '花溪', '青岩', '筑城', '云上', '梵净山', '赤水', '茅台', '乌蒙', '黄果树', '西江', '镇远', '荔波', '都匀', '万峰林', '百里杜鹃', '织金洞', '龙宫', '丹寨', '施秉', '肇兴', '苗岭', '夜郎']
  const hotelSuffixes = { star_hotel: '大酒店', non_star_hotel: '酒店', minshuku: '民宿', kezhan: '客栈', other: '旅馆' }
  const categories = ['star_hotel', 'non_star_hotel', 'minshuku', 'kezhan', 'other']
  const businessTypes = ['企业法人', '个体工商户', '个人经营']
  const operatingStatuses = ['operating', 'operating', 'operating', 'operating', 'operating', 'suspended', 'closed', 'renovating']
  const accommodations = []
  const usedNames = new Set()
  let id = 1

  for (const city of CITY_META) {
    for (let i = 0; i < city.count; i++) {
      const category = categories[Math.floor(rand() * categories.length)]
      const countyCode = city.counties[Math.floor(rand() * city.counties.length)]
      let name
      do {
        name = prefixes[Math.floor(rand() * prefixes.length)] + hotelSuffixes[category] + (rand() > 0.7 ? Math.floor(rand() * 90 + 10) : '')
      } while (usedNames.has(name))
      usedNames.add(name)

      const rooms = category === 'star_hotel' ? Math.floor(rand() * 300) + 80 : category === 'non_star_hotel' ? Math.floor(rand() * 120) + 30 : Math.floor(rand() * 28) + 6
      const beds = Math.floor(rooms * (1.25 + rand() * 0.65))
      const occupancyRate = Math.round((38 + rand() * 52) * 10) / 10
      const adr = Math.round((category === 'star_hotel' ? 320 : category === 'minshuku' ? 180 : 110) + rand() * 520)
      const longitude = Math.round((city.lngBase + (rand() - 0.5) * 0.65) * 10000) / 10000
      const latitude = Math.round((city.latBase + (rand() - 0.5) * 0.52) * 10000) / 10000

      accommodations.push({
        id,
        name,
        creditCode: generateCreditCode(rand),
        category,
        provinceCode: '520000',
        cityCode: city.cityCode,
        countyCode,
        detailAddress: `${areaName(countyCode)}${name}路${Math.floor(rand() * 188 + 1)}号`,
        businessType: businessTypes[Math.floor(rand() * businessTypes.length)],
        licenseStatus: rand() > 0.15 ? 'licensed' : 'pending',
        openDate: `${2008 + Math.floor(rand() * 17)}-${String(Math.floor(rand() * 12) + 1).padStart(2, '0')}-${String(Math.floor(rand() * 28) + 1).padStart(2, '0')}`,
        operatingStatus: operatingStatuses[Math.floor(rand() * operatingStatuses.length)],
        rooms,
        beds,
        floorArea: Math.floor(rooms * (18 + rand() * 28)),
        hasDining: rand() > 0.35,
        hasConference: rand() > 0.62,
        hasParking: rand() > 0.22,
        hasPool: rand() > 0.84,
        hasGym: rand() > 0.72,
        hasAccessibility: rand() > 0.48,
        fireSafetyCertified: rand() > 0.12,
        occupancyRate,
        adr,
        revpar: Math.round(adr * occupancyRate / 100),
        annualRevenue: Math.round(rooms * 365 * (occupancyRate / 100) * adr),
        staffCount: Math.max(2, Math.floor(rooms * (category === 'star_hotel' ? 0.8 : 0.35))),
        guestSourceMarkets: JSON.stringify(['国内散客', rand() > 0.45 ? '线上预订' : '国内团队']),
        starRating: category === 'star_hotel' ? Math.floor(rand() * 5) + 1 : null,
        brandAffiliation: category === 'star_hotel' && rand() > 0.4 ? ['贵旅', '希尔顿', '亚朵', '锦江'][Math.floor(rand() * 4)] : '',
        onlineRating: Math.round((3.6 + rand() * 1.3) * 10) / 10,
        complaintCount: Math.floor(rand() * 8),
        certifications: JSON.stringify(rand() > 0.72 ? ['星级旅游饭店'] : []),
        specialPermits: JSON.stringify(['特种行业许可证']),
        fireInspection: rand() > 0.18 ? 'passed' : 'pending',
        healthPermit: rand() > 0.12 ? 'valid' : 'none',
        safetyIncidents: rand() > 0.93 ? 1 : 0,
        hasEmergencyPlan: rand() > 0.18,
        longitude,
        latitude,
        createdBy: 2,
        updatedBy: null,
        createdAt: now,
        updatedAt: now,
      })
      id++
    }
  }

  return accommodations
}

function generateCensusTasks() {
  const now = new Date()
  const formatDate = d => d.toISOString()
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
  return [
    {
      id: 1,
      taskType: 'main',
      title: '2026年贵州省住宿业普查',
      description: '覆盖贵州省住宿业单位，采集工商信息、实际经营、经营规模、线上平台和现场留痕数据。',
      deadline: formatDate(addDays(now, 60)),
      status: 'in_progress',
      scopeType: 'province',
      scopeAreaCodes: JSON.stringify(['520000']),
      assignedAreaCodes: JSON.stringify(['520000']),
      createdBy: 2,
      createdAt: formatDate(addDays(now, -12)),
      updatedAt: formatDate(addDays(now, -2)),
    },
    {
      id: 2,
      taskType: 'sub',
      parentTaskId: 1,
      title: '贵阳市住宿业普查子任务',
      description: '贵阳市辖区住宿单位现场采集。',
      deadline: formatDate(addDays(now, 35)),
      status: 'in_progress',
      assignedAreaCodes: JSON.stringify(['520102', '520111']),
      responsibleUserIds: JSON.stringify([11, 12]),
      responsibleUserNames: '普查员甲、普查员乙',
      createdBy: 2,
      createdAt: formatDate(addDays(now, -10)),
      updatedAt: formatDate(addDays(now, -1)),
    },
    {
      id: 3,
      taskType: 'sub',
      parentTaskId: 1,
      title: '遵义市住宿业普查子任务',
      description: '遵义市重点旅游住宿单位现场采集。',
      deadline: formatDate(addDays(now, 42)),
      status: 'published',
      assignedAreaCodes: JSON.stringify(['520302', '520382']),
      responsibleUserIds: JSON.stringify([13]),
      responsibleUserNames: '普查员丙',
      createdBy: 2,
      createdAt: formatDate(addDays(now, -9)),
      updatedAt: formatDate(addDays(now, -1)),
    },
    {
      id: 4,
      taskType: 'main',
      title: '贵州重点旅游区住宿服务质量复核',
      description: '围绕黄果树、西江千户苗寨、梵净山、荔波等重点旅游区开展复核。',
      deadline: formatDate(addDays(now, 45)),
      status: 'draft',
      scopeType: 'custom',
      scopeAreaCodes: JSON.stringify(['520400', '520600', '522600', '522700']),
      assignedAreaCodes: JSON.stringify(['520400', '520600', '522600', '522700']),
      createdBy: 2,
      createdAt: formatDate(addDays(now, -3)),
      updatedAt: formatDate(addDays(now, -3)),
    },
  ]
}

function generateAssignments(tasks) {
  const now = new Date().toISOString()
  const assignments = []
  let id = 1
  for (const task of tasks.filter(t => t.taskType === 'sub')) {
    const areaCodes = JSON.parse(task.assignedAreaCodes || '[]')
    const userIds = JSON.parse(task.responsibleUserIds || '[]')
    const firstUser = userIds[0] || null
    for (const areaCode of areaCodes) {
      assignments.push({
        id,
        taskId: task.id,
        parentTaskId: task.parentTaskId,
        areaCode,
        areaName: areaName(areaCode),
        assignedTo: firstUser,
        assignedToIds: JSON.stringify(userIds),
        assignedToName: task.responsibleUserNames,
        status: task.status === 'in_progress' ? 'in_progress' : 'pending',
        progress: task.status === 'in_progress' ? 25 : 0,
        submittedAt: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewComment: null,
        createdAt: task.createdAt || now,
        updatedAt: task.updatedAt || now,
      })
      id++
    }
  }
  return assignments
}

async function clearSeededData(db) {
  await db.transaction('rw', db.areas, db.users, db.accommodations, db.censusTasks, db.censusAssignments, db.censusRecords, db.operationLogs, async () => {
    await db.areas.clear()
    await db.users.clear()
    await db.accommodations.clear()
    await db.censusTasks.clear()
    await db.censusAssignments.clear()
    await db.censusRecords.clear()
    await db.operationLogs.clear()
  })
}

export async function seedDatabase(db) {
  const currentVersion = localStorage.getItem('accommodation_seed_version')
  const areaCount = await db.areas.count()
  const firstArea = areaCount > 0 ? await db.areas.orderBy('code').first() : null
  const shouldReseed = currentVersion !== SEED_VERSION || firstArea?.code?.startsWith('53')

  if (areaCount > 0 && !shouldReseed) return

  console.log('[Seed] 初始化贵州省演示数据...')
  if (areaCount > 0) await clearSeededData(db)

  const users = await generateUsers()
  const accommodations = generateAccommodations()
  const tasks = generateCensusTasks()
  const assignments = generateAssignments(tasks)

  await db.transaction('rw', db.areas, db.users, db.accommodations, db.censusTasks, db.censusAssignments, db.censusRecords, async () => {
    await db.areas.bulkAdd(AREA_DATA)
    await db.users.bulkAdd(users)
    await db.accommodations.bulkAdd(accommodations)
    await db.censusTasks.bulkAdd(tasks)
    await db.censusAssignments.bulkAdd(assignments)
  })

  localStorage.setItem('accommodation_seed_version', SEED_VERSION)
  console.log(`[Seed] 贵州数据初始化完成：${AREA_DATA.length}个区域, ${users.length}个用户, ${accommodations.length}个住宿单位, ${tasks.length}个任务, ${assignments.length}个子任务分配`)
}
