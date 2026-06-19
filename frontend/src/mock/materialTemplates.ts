import { MaterialNodeType, type MaterialTemplate } from '@/types'

const folder = (name: string, children: MaterialTemplate['items'] = [], required = true): MaterialTemplate['items'][number] => ({
  name,
  type: MaterialNodeType.FOLDER,
  required,
  children,
})

const file = (name: string, required = true): MaterialTemplate['items'][number] => ({
  name,
  type: MaterialNodeType.FILE,
  required,
})

export const materialTemplates: MaterialTemplate[] = [
  {
    caseType: '民事案件',
    items: [
      folder('诉讼材料', [
        folder('起诉状', [
          file('起诉状正本'),
          file('起诉状副本'),
        ]),
        folder('证据材料', [
          file('证据清单'),
          file('主要证据材料'),
        ]),
        folder('授权委托', [
          file('授权委托书'),
          file('律师事务所函'),
        ]),
      ]),
      folder('当事人材料', [
        file('原告主体资格证明'),
        file('被告主体资格证明'),
        file('法定代表人身份证明'),
      ]),
      folder('法院材料', [
        file('受理通知书'),
        file('举证通知书'),
        file('开庭传票'),
      ]),
      folder('裁判文书', [
        file('判决书/调解书'),
        file('送达回证'),
      ], false),
    ],
  },
  {
    caseType: '刑事案件',
    items: [
      folder('辩护材料', [
        folder('辩护意见', [
          file('辩护词'),
        ]),
        folder('证据材料', [
          file('起诉书'),
          file('鉴定意见'),
          file('证据目录'),
        ]),
      ]),
      folder('委托手续', [
        file('委托书'),
        file('亲属关系证明'),
        file('律师事务所函'),
      ]),
      folder('会见材料', [
        file('会见笔录'),
      ], false),
      folder('裁判文书', [
        file('判决书'),
        file('裁定书'),
      ], false),
    ],
  },
  {
    caseType: '劳动争议',
    items: [
      folder('仲裁材料', [
        file('仲裁申请书'),
        file('证据清单'),
      ]),
      folder('证据材料', [
        file('劳动合同'),
        file('工资流水'),
        file('社保缴纳证明'),
        file('解除/终止劳动合同通知书'),
      ]),
      folder('当事人材料', [
        file('申请人身份证明'),
        file('被申请人工商信息'),
      ]),
      folder('裁判文书', [
        file('仲裁裁决书'),
        file('法院判决书'),
      ], false),
    ],
  },
  {
    caseType: '行政案件',
    items: [
      folder('起诉材料', [
        file('行政起诉状'),
        file('证据清单'),
      ]),
      folder('证据材料', [
        file('行政决定书'),
        file('相关证据材料'),
      ]),
      folder('授权委托', [
        file('授权委托书'),
        file('律师事务所函'),
      ]),
      folder('裁判文书', [
        file('行政判决书'),
      ], false),
    ],
  },
]

export const getTemplateByCaseType = (caseType: string): MaterialTemplate | undefined => {
  return materialTemplates.find(t => t.caseType === caseType)
}
