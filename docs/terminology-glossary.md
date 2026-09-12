# KrishiSetu terminology glossary

Use this file as the source of truth for every user-visible role label and short description. Internal enum/API keys stay unchanged.

| Internal key | Old label | Approved display name | Approved short description |
| --- | --- | --- | --- |
| `FARMER` | Farmer | Farmer (Kisan) | Apni fasal ka sahi daam paayein. Bechein, daam compare karein, seva book karein. |
| `FPO_ADMIN` | FPO aggregator | Group Selling (Kisan Samuh) | Aas paas ke kisano ke saath milkar bechein. Zyada fasal ek saath, behtar daam. |
| `BUYER` + `buyerType=LOCAL` | Buyer | Local Buyer | Aas paas ke kisano se seedha khareedein. |
| `BUYER` + `buyerType=BULK` | Buyer | Bulk Buyer | Bade paimane par kisan samuho se khareedein. |
| `STORAGE_OPERATOR` | Storage operator | Storage Owner (Godown Wala) | Khaali jagah hai? Kisano aur khareedaro ko booking ke liye dikhayein. |
| `TRANSPORT_OPERATOR` | Transport operator | Transport Owner (Gaadi Wala) | Gaadi hai? Fasal ko khet se mandi tak pahunchayein aur kamayein. |
| `EQUIPMENT_PROVIDER` | Equipment provider | Machine Owner (Machine Wala) | Apna tractor ya machine kisano ko kaam ke liye dein aur kamayein. |
| `LABOR_CONTRACTOR` | Labor contractor | Labor Provider (Mazdoor Uplabdh Karayen) | Kisano ko khet ke kaam ke liye mazdoor dhundhne mein madad karein. |
| `INPUT_SUPPLIER` | Input supplier | Seed & Fertilizer Supplier (Beej-Khaad Wala) | Aas paas ke kisano ko beej, khaad aur zaroori saman bechein. |
| `DISTRICT_ADMIN` | District administration | District Office (Zila Karyalay) | Sthaniya jaanch aur shikayaton mein madad karein. |
| `STATE_ADMIN` | State command | State Office (Rajya Karyalay) | Poore rajya ki jaankari aur bina suljhi samasyaon ko dekhein. |

## Plain-language terms

| Avoid in farmer UI | Say instead |
| --- | --- |
| aggregation / pool | milkar bechna / group selling |
| procurement | khareed / buying |
| capacity | jagah / gaadi ki jagah |
| lot | fasal / maal |
| logistics | delivery / aana-jaana |
| net realization | haath mein aaya paisa |
| KYC | pehchaan verify |
| dispute | shikayat |

Technical words may remain in admin and developer documentation only, with a plain-language meaning beside them.
