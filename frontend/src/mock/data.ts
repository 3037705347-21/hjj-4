import type { Case, MaterialNode } from '@/types'
import { CaseStatus, MaterialNodeType } from '@/types'

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

const createFolder = (name: string, children: MaterialNode[] = [], expanded = false): MaterialNode => ({
  id: generateId(),
  name,
  type: MaterialNodeType.FOLDER,
  children,
  expanded,
})

const createFile = (name: string, uploader: string, fileSize: string, description: string = ''): MaterialNode => ({
  id: generateId(),
  name,
  type: MaterialNodeType.FILE,
  uploadDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  uploader,
  fileSize,
  description,
})

export const generateDemoCases = (): Case[] => [
  {
    id: generateId(),
    caseNumber: '(2026)京民初字第001号',
    name: '北京某科技公司与上海某贸易公司买卖合同纠纷案',
    client: '北京某科技有限公司',
    opposingParty: '上海某贸易有限公司',
    caseType: '民事案件',
    status: CaseStatus.IN_PROGRESS,
    responsibleLawyer: '张伟律师',
    filingDate: '2026-01-15',
    description: '原告北京某科技公司诉被告上海某贸易公司买卖合同纠纷一案，原告要求被告支付拖欠货款共计人民币580万元及违约金。',
    materials: [
      createFolder('诉讼材料', [
        createFolder('起诉状', [
          createFile('起诉状正本.pdf', '张伟', '245 KB', '民事起诉状正本'),
          createFile('起诉状副本.pdf', '张伟', '248 KB', '民事起诉状副本'),
        ], true),
        createFolder('证据材料', [
          createFile('证据清单.xlsx', '李娜', '32 KB', '证据清单明细'),
          createFile('买卖合同.pdf', '李娜', '1.2 MB', '双方签订的买卖合同原件扫描件'),
          createFile('送货单.pdf', '李娜', '856 KB', '货物签收单据'),
          createFile('对账单.pdf', '李娜', '428 KB', '双方财务对账单'),
          createFile('催款函.pdf', '李娜', '189 KB', '多次催款函件'),
        ]),
        createFolder('授权委托', [
          createFile('授权委托书.pdf', '王芳', '156 KB', '当事人授权委托书'),
          createFile('律师事务所函.pdf', '王芳', '98 KB', '律师事务所公函'),
        ]),
      ], true),
      createFolder('当事人材料', [
        createFile('原告营业执照.pdf', '张伟', '680 KB', '原告公司营业执照副本'),
        createFile('法定代表人身份证明.pdf', '张伟', '145 KB', '法定代表人身份证明书'),
        createFile('被告工商信息.pdf', '李娜', '280 KB', '被告工商登记信息查询'),
      ]),
      createFolder('法院材料', [
        createFile('受理通知书.pdf', '王芳', '198 KB', '案件受理通知书'),
        createFile('举证通知书.pdf', '王芳', '176 KB', '举证期限通知书'),
      ]),
    ],
  },
  {
    id: generateId(),
    caseNumber: '(2026)京刑初字第023号',
    name: '王某涉嫌职务侵占罪案',
    client: '王某',
    opposingParty: '北京市某区人民检察院',
    caseType: '刑事案件',
    status: CaseStatus.PENDING,
    responsibleLawyer: '李明律师',
    filingDate: '2026-03-20',
    description: '被告人王某涉嫌利用职务便利侵占公司财物共计人民币120万元，辩护人作罪轻辩护。',
    materials: [
      createFolder('辩护材料', [
        createFolder('辩护意见', [
          createFile('辩护词初稿.docx', '李明', '56 KB', '辩护词初稿'),
        ]),
        createFolder('证据材料', [
          createFile('起诉书.pdf', '李明', '220 KB', '检察院起诉书'),
          createFile('审计报告.pdf', '李明', '2.3 MB', '司法会计鉴定审计报告'),
          createFile('银行流水.pdf', '李明', '5.6 MB', '涉案银行账户交易流水'),
        ]),
      ], true),
      createFolder('委托手续', [
        createFile('委托书.pdf', '赵静', '132 KB', '家属签署的委托书'),
        createFile('亲属关系证明.pdf', '赵静', '210 KB', '亲属关系证明文件'),
      ]),
    ],
  },
  {
    id: generateId(),
    caseNumber: '(2025)京民终字第156号',
    name: '某房地产开发公司建设工程施工合同纠纷上诉案',
    client: '某房地产开发有限公司',
    opposingParty: '某建设集团有限公司',
    caseType: '民事案件',
    status: CaseStatus.CLOSED,
    responsibleLawyer: '陈静律师',
    filingDate: '2025-08-10',
    description: '上诉人某房地产开发公司因与被上诉人某建设集团建设工程施工合同纠纷一案，不服一审判决提起上诉。本案已二审审结。',
    materials: [
      createFolder('一审材料', [
        createFile('一审判决书.pdf', '陈静', '680 KB', '一审法院判决书'),
        createFile('一审庭审笔录.pdf', '陈静', '1.1 MB', '一审开庭审理笔录'),
      ]),
      createFolder('二审材料', [
        createFile('上诉状.pdf', '陈静', '320 KB', '民事上诉状'),
        createFile('二审判决书.pdf', '陈静', '540 KB', '二审终审判决书'),
        createFile('代理词.pdf', '陈静', '178 KB', '二审代理意见'),
      ], true),
      createFolder('证据材料', [
        createFile('建设工程施工合同.pdf', '刘强', '2.8 MB', '施工合同及补充协议'),
        createFile('工程结算报告.pdf', '刘强', '3.5 MB', '工程造价结算报告'),
        createFile('工程验收单.pdf', '刘强', '1.9 MB', '各分项工程验收单据'),
      ]),
    ],
  },
  {
    id: generateId(),
    caseNumber: '(2026)京劳仲字第089号',
    name: '张某与某互联网公司劳动争议仲裁案',
    client: '张某',
    opposingParty: '某互联网科技有限公司',
    caseType: '劳动争议',
    status: CaseStatus.IN_PROGRESS,
    responsibleLawyer: '刘洋律师',
    filingDate: '2026-04-05',
    description: '申请人张某要求被申请人某互联网公司支付违法解除劳动合同赔偿金、未休年假工资等共计人民币35万元。',
    materials: [
      createFolder('仲裁材料', [
        createFile('仲裁申请书.pdf', '刘洋', '198 KB', '劳动仲裁申请书'),
        createFile('证据清单.xlsx', '刘洋', '28 KB', '证据目录清单'),
      ], true),
      createFolder('证据材料', [
        createFile('劳动合同.pdf', '孙悦', '420 KB', '劳动合同书'),
        createFile('解除通知书.pdf', '孙悦', '156 KB', '公司解除劳动合同通知书'),
        createFile('工资流水.pdf', '孙悦', '890 KB', '离职前12个月工资银行流水'),
        createFile('社保缴纳证明.pdf', '孙悦', '245 KB', '社会保险缴费证明'),
      ]),
    ],
  },
]

export const mockCases: Case[] = generateDemoCases()

export const caseStatusMap: Record<CaseStatus, { label: string; class: string }> = {
  [CaseStatus.PENDING]: {
    label: '待处理',
    class: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  [CaseStatus.IN_PROGRESS]: {
    label: '进行中',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  [CaseStatus.CLOSED]: {
    label: '已结案',
    class: 'bg-gray-100 text-gray-800 border-gray-200',
  },
}
