/**
 * 合否通知メールに添付する同封書類6点(合否通知書・学費案内・入学規約・学用品一覧・制服案内・入学までの流れ)。
 * ファイルの実体を Base64 で埋め込んでいるため、サーバーレス環境でも
 * ファイルシステム/URL に依存せず確実に添付できる。
 * docs/ 配下の元ファイルを更新したら scripts/gen-decision-attachments.mjs を再実行して再生成すること。
 */
import type { EmailAttachment } from "@/lib/notify";

const RESULT_LETTER_B64 =
  "5ZCI5ZCm6YCa55+l5pu4CgrjgZPjga7luqbjga/mnbHplqLmnbHppqzkuovlrabpmaLjga7lhaXlrabpgbjogIPjgavjgZTlh7rpoZjjgYTjgZ/jgaDjgY3j" +
  "gIHoqqDjgavjgYLjgorjgYzjgajjgYbjgZTjgZbjgYTjgb7jgZfjgZ/jgIIKCuWOs+ato+OBquOCi+mBuOiAg+OBrue1kOaenOOCkuOAgeacrOeKtuOCkuOC" +
  "guOBo+OBpuOBlOmAmuefpeeUs+OBl+S4iuOBkuOBvuOBmeOAggrpgbjogIPntZDmnpzjga7oqbPntLDjgavjgaTjgY3jgb7jgZfjgabjga/jgIHmnKzjg6Hj" +
  "g7zjg6vmnKzmlofjgYrjgojjgbPlhaXlrabogIXlsILnlKjjg57jgqTjg5rjg7zjgrjjga7jgIzlkIjlkKbnorroqo3jgI3jg5rjg7zjgrjjgpLjgYLjgo/j" +
  "gZvjgabjgZTnorroqo3jgY/jgaDjgZXjgYTjgIIKCuOBlOS4jeaYjuOBqueCueOBjOOBlOOBluOBhOOBvuOBl+OBn+OCieOAgeOBhOOBpOOBp+OCguWtpumZ" +
  "ouS6i+WLmeWxgOOBvuOBp+OBiuWVj+OBhOWQiOOCj+OBm+OBj+OBoOOBleOBhOOAggoK5p2x6Zai5p2x6aas5LqL5a2m6ZmiIOWFpeWtpumBuOiAg+S6i+WL" +
  "meWxgAo=";

const TUITION_GUIDE_B64 =
  "5a2m6LK75qGI5YaFICjmnbHplqLmnbHppqzkuovlrabpmaIpCgrilqAg5YWl5a2m5pmC44Gr5b+F6KaB44Gq6LK755SoCuODu+WFpeWtpumHkTogMzAwLDAw" +
  "MOWGhgrjg7vliLbmnI3ku6M6IDg1LDAwMOWGhgrjg7vmlZnmnZDosrs6IDQyLDAwMOWGhgrlkIjoqIg6IDQyNywwMDDlhoYKCuKWoCDlnKjlrabkuK3jgavl" +
  "v4XopoHjgarosrvnlKggKOW5tOmhjeOBruebruWuiSkK44O75o6I5qWt5paZCuODu+WvruiyuyAo5YWl5a+u6ICF44Gu44G/KQrjg7vjgZ3jga7ku5boq7jn" +
  "tYzosrsgKOaVmeadkOi/veWKoOizvOWFpeODu+Wun+e/kuiyu+etiSkK6Kmz57Sw44Gv5Yil6YCU5a2m6LK76KaP56iL6LOH5paZ44Gr44Gm44GU5qGI5YaF" +
  "44GE44Gf44GX44G+44GZ44CCCgrilqAg44GK5pSv5omV44GE5pa55rOVCuS7peS4i+OBruOBhOOBmuOCjOOBi+OCkuOBiumBuOOBs+OBhOOBn+OBoOOBkeOB" +
  "vuOBmeOAggrjg7vjgq/jg6zjgrjjg4Pjg4jjgqvjg7zjg4nmsbrmuIggKOODnuOCpOODmuODvOOCuOOCiOOCiuOCquODs+ODqeOCpOODs+OBp+OBiuaJi+e2" +
  "muOBjeOBhOOBn+OBoOOBkeOBvuOBmSkK44O76YqA6KGM5oyv6L68CiAgR01P44GC44GK44Ge44KJ44ON44OD44OI6YqA6KGMIOazleS6uuWWtualremDqCDm" +
  "ma7pgJogMjQ5NjA3MSAo5Y+j5bqn5ZCN576pOiDjg6rjg4jjgqbjg4EpCiAg4oC75oyv6L685omL5pWw5paZ44Gv44GU6LKg5ouF44GP44Gg44GV44GE44CC" +
  "44GK5ZCN5YmN44Gv5YWl5a2m6ICF44GU5pys5Lq644Gu5rCP5ZCN44Gn44GK6aGY44GE44GX44G+44GZ44CCCgrilqAg44GK5pSv5omV44GE5pyf6ZmQCuWF" +
  "peWtpuaJi+e2muOBjeabuOmhnuOBruWIsOedgOW+jOOAgeaMh+WumuOBruacn+aXpeOBvuOBp+OBq+OBiuaJi+e2muOBjeOBj+OBoOOBleOBhOOAguacn+aX" +
  "peOBr+ODnuOCpOODmuODvOOCuOOAjOWFpeWtpuaJi+e2muOBjeOAjeODmuODvOOCuOOBq+ihqOekuuOBleOCjOOBvuOBmeOAggoK44GU5LiN5piO44Gq54K5" +
  "44Gv5a2m6Zmi5LqL5YuZ5bGA44G+44Gn44GK5rCX6Lu944Gr44GK5ZWP44GE5ZCI44KP44Gb44GP44Gg44GV44GE44CCCg==";

const SCHOOL_RULES_B64 =
  "5p2x6Zai5p2x6aas5LqL5a2m6ZmiIOWFpeWtpuimj+e0hAoK56ysMeadoSjnm67nmoQpCuacrOimj+e0hOOBr+OAgeadsemWouadsemmrOS6i+mrmOetieWt" +
  "pumZouODu+adsemWouadsemmrOS6i+WwgumWgOWtpumZoijku6XkuIvjgIzmnKzlrabpmaLjgI0p44G444Gu5YWl5a2m44GK44KI44Gz5Zyo5a2m5Lit44Gu" +
  "55Sf5rS744Gr6Zai44GZ44KL5Z+65pys5LqL6aCF44KS5a6a44KB44KL44KC44Gu44Gn44GZ44CCCgrnrKwy5p2hKOaVmeiCsuaWuemHnSkK5pys5a2m6Zmi" +
  "44Gv44CB6aas44Go44Go44KC44Gr5a2m44G25a6f6Le15pWZ6IKy44KS6YCa44GY44Gm44CB55Sf5b6S5LiA5Lq644Gy44Go44KK44Gu6Ieq56uL44Go56S+" +
  "5Lya5oCn44Gu6IKy5oiQ44KS55uu5oyH44GX44G+44GZ44CC55Sf5b6S44Gv5pys5a2m6Zmi44Gu5pWZ6IKy5pa56Yed44KS55CG6Kej44GX44CB6Kqg5a6f" +
  "44Gr5a2m5qWt44GK44KI44Gz5a6f57+S44Gr5Y+W44KK57WE44KA44KC44Gu44Go44GX44G+44GZ44CCCgrnrKwz5p2hKOWvrueUn+a0uykKMS4g55Sf5b6S" +
  "44Gv5Y6f5YmH44Go44GX44Gm5a2m6Zmi5a+u44Gr5YWl5a+u44GX44CB5YWx5ZCM55Sf5rS744Gu6KaP5YmHKOi1t+W6iuODu+a2iOeBr+aZgumWk+OAgea4" +
  "heaOg+W9k+eVquOAgeWkluWHuuODu+WkluaziuOBruWxiuWHuuetiSnjgpLlrojjgovjgoLjga7jgajjgZfjgb7jgZnjgIIKMi4g5aSW5rOK44Gr44Gv5L+d" +
  "6K236ICF44Gu5om/6KqN44Go5a2m6Zmi44G444Gu5LqL5YmN55Sz6KuL44GM5b+F6KaB44Gn44GZ44CCCgrnrKw05p2hKOmmrOOBruWPluOCiuaJseOBhCkK" +
  "MS4g55Sf5b6S44Gv5ouF5b2T6aas44Gu6aO86aSK566h55CG44Gr6LKs5Lu744KS5oyB44Gh44CB44K544K/44OD44OV44Gu5oyH5bCO44Gu44KC44Go5a6J" +
  "5YWo44Gr6YWN5oWu44GX44Gm5L2c5qWt44O76aiO5LmX44KS6KGM44GG44KC44Gu44Go44GX44G+44GZ44CCCjIuIOmmrOOBuOOBruiZkOW+heihjOeCuuOD" +
  "u+WuieWFqOOCkuiEheOBi+OBmeihjOeCuuOBr+WOs+agvOOBq+emgeatouOBl+OBvuOBmeOAggoK56ysNeadoSjlrabntI3ph5EpCjEuIOWFpeWtpumHkeOD" +
  "u+aOiOalreaWmeODu+Wvruiyu+ODu+aVmeadkOiyu+etieOBr+aJgOWumuOBruacn+aXpeOBvuOBp+OBq+e0jeWFpeOBmeOCi+OCguOBruOBqOOBl+OBvuOB" +
  "meOAggoyLiDkuIDluqbntI3lhaXjgZXjgozjgZ/lhaXlrabph5Hjga/jgIHljp/liYfjgajjgZfjgabov5TpgoTjgYTjgZ/jgZfjgb7jgZvjgpPjgIIKCues" +
  "rDbmnaEo5YGl5bq3566h55CGKQrmjIHnl4Xjg7vjgqLjg6zjg6vjgq7jg7zjg7vmnI3olqznrYnjga7lgaXlurfmg4XloLHjga/jgIHlhaXlrabmiYvntprj" +
  "gY3mmYLjgavmraPnorrjgavnlLPlkYrjgZnjgovjgoLjga7jgajjgZfjgb7jgZnjgILnlLPlkYrlhoXlrrnjga/nlJ/lvpLjga7lronlhajnorrkv53jga7n" +
  "m67nmoTjgavjga7jgb/kvb/nlKjjgZfjgb7jgZnjgIIKCuesrDfmnaEo6YCA5a2m44O75Yem5YiGKQrmnKzopo/ntITjgb7jgZ/jga/lrabpmaLjga7oq7jo" +
  "po/liYfjgavokZfjgZfjgY/pgZXlj43jgZfjgZ/loLTlkIjjgIHmjIflsI7jg7vlgZzlrabjg7vpgIDlrabnrYnjga7lh6bliIbjgpLooYzjgYbjgZPjgajj" +
  "gYzjgYLjgorjgb7jgZnjgIIKCuesrDjmnaEo5YCL5Lq65oOF5aCxKQrmnKzlrabpmaLjga/jgIHnlJ/lvpLjgYrjgojjgbPkv53orbfogIXjga7lgIvkurrm" +
  "g4XloLHjgpLmlZnogrLnm67nmoTjgYrjgojjgbPnt4rmgKXmmYLjga7pgKPntaHjgavjga7jgb/kvb/nlKjjgZfjgIHpganliIfjgavnrqHnkIbjgZfjgb7j" +
  "gZnjgIIKCuS7peS4iuOBruWGheWuueOBq+WQjOaEj+OBruOBhuOBiOOAgeWFpeWtpuaJi+e2muOBjeOCkuihjOOBo+OBpuOBj+OBoOOBleOBhOOAggo=";

const SUPPLIES_LIST_B64 =
  "5a2m55So5ZOB5LiA6KanICjmnbHplqLmnbHppqzkuovlrabpmaIpCgrlhaXlrabjgb7jgafjgavjgZTmupblgpnjgYTjgZ/jgaDjgY/lrabnlKjlk4Hjga/k" +
  "u6XkuIvjga7jgajjgYrjgorjgafjgZnjgILjgrXjgqTjgrrnmbvpjLLjga/jg57jgqTjg5rjg7zjgrjjgIzlhaXlrabmiYvntprjgY3jgI3jg5rjg7zjgrjj" +
  "gafmib/jgaPjgabjgYrjgorjgb7jgZnjgIIKCuKWoCDlrabpmaLmjIflrprlk4EgKOWtpumZouOBq+OBpuaJi+mFjeODu+OBiua4oeOBlykK44O75Yi25pyN" +
  "5LiA5byPICjjgrXjgqTjgro6IFMgLyBNIC8gTCAvIExMIC8gM0wpCuODu+S5l+mmrOODluODvOODhCAo44K144Kk44K6OiAyMy4wY20g44CcIDI4LjBjbeOA" +
  "gTAuNWNt5Yi744G/KQrjg7vjg5jjg6vjg6Hjg4Pjg4ggKOOCteOCpOOCujogUyg1NC01NmNtKSAvIE0oNTYtNThjbSkgLyBMKDU4LTYwY20pIC8gWEwoNjAt" +
  "NjJjbSkpCuODu+aVmeenkeabuOODu+Wun+e/kueUqOaVmeadkOS4gOW8jwoK4pagIOOBlOiHqui6q+OBp+OBlOeUqOaEj+OBhOOBn+OBoOOBj+OCguOBrgrj" +
  "g7vmma7mrrXnnYAgKOWvrueUn+a0u+ODu+Wun+e/kuOBruWQiOmWk+OBq+S9v+eUqCkK44O75rSX6Z2i55So5YW344O75a+d5YW3ICjlr67jga7lgpnjgYjk" +
  "u5jjgZHlk4HjgavjgaTjgYTjgabjga/liKXpgJTjgZTmoYjlhoXjgZfjgb7jgZkpCuODu+ethuiomOeUqOWFt+OAgeODjuODvOODiArjg7vpm6jlhbcKCuKW" +
  "oCDjgrXjgqTjgrrnmbvpjLLjgavjgaTjgYTjgaYK5Yi25pyN44O744OW44O844OE44O744OY44Or44Oh44OD44OI44Gu44K144Kk44K644Gv44CB44Oe44Kk" +
  "44Oa44O844K444Gu5YWl5a2m5omL57aa44GN44Oa44O844K444KI44KK44GU55m76Yyy44GP44Gg44GV44GE44CCCuOBlOeZu+mMsuOBhOOBn+OBoOOBhOOB" +
  "n+OCteOCpOOCuuOCkuOCguOBqOOBq+WtpumZouOBq+OBpuaJi+mFjeOBl+OAgeWFpeWtpuW8j+W9k+aXpeOBvuOBp+OBq+OBiua4oeOBl+OBhOOBn+OBl+OB" +
  "vuOBmeOAggoK5LiN5piO54K544GM44GU44GW44GE44G+44GX44Gf44KJ5a2m6Zmi5LqL5YuZ5bGA44G+44Gn44GK5ZWP44GE5ZCI44KP44Gb44GP44Gg44GV" +
  "44GE44CCCg==";

const UNIFORM_GUIDE_B64 =
  "5Yi25pyN5qGI5YaFICjmnbHplqLmnbHppqzkuovlrabpmaIpCgrilqAg5Yi25pyN44Gr44Gk44GE44GmCuacrOWtpumZouOBruWItuacjeOBr+OAgeWun+e/" +
  "kuODu+S5l+mmrOOBq+mBqeOBl+OBn+apn+iDveaAp+OCkuWCmeOBiOOBn+ODh+OCtuOCpOODs+OBqOOBquOBo+OBpuOBiuOCiuOBvuOBmeOAggrjgrXjgqTj" +
  "grrlsZXplos6IFMgLyBNIC8gTCAvIExMIC8gM0wKCuKWoCDjgrvjg4Pjg4jlhoXlrrkK44O75LiK552ACuODu+ODkeODs+ODhCAo44Kt44Ol44Ot44OD44OI" +
  "KQrjg7vjgrfjg6Pjg4QK44O75oyH5a6a44OZ44Or44OICgrilqAg5o6h5a+444O744K144Kk44K66YG45oqeCuOBiuaJi+aMgeOBoeOBruiho+mhnuOBruWu" +
  "n+WvuOOCkuWPguiAg+OBq+OAgeODnuOCpOODmuODvOOCuOOAjOWFpeWtpuaJi+e2muOBjeOAjeODmuODvOOCuOOBi+OCieOCteOCpOOCuuOCkuOBlOmBuOaK" +
  "nuOBj+OBoOOBleOBhOOAggrjgrXjgqTjgrrjgavkuI3lronjgYzjgYLjgovloLTlkIjjga/jgIHlrabpmaLkuovli5nlsYDjgb7jgafjgYrllY/jgYTlkIjj" +
  "go/jgZvjgYTjgZ/jgaDjgZHjgozjgbDjgrXjgqTjgrrooajjgpLjgYrpgIHjgorjgYTjgZ/jgZfjgb7jgZnjgIIKCuKWoCDjgYrmuKHjgZfmmYLmnJ8K44GU" +
  "55m76Yyy44GE44Gf44Gg44GE44Gf44K144Kk44K644KS44KC44Go44Gr5omL6YWN44GX44CB5YWl5a2m5byP5b2T5pel44G+44Gn44Gr44GK5rih44GX44GE" +
  "44Gf44GX44G+44GZ44CCCuOCteOCpOOCuuS6pOaPm+OCkuOBlOW4jOacm+OBruWgtOWQiOOBr+WFpeWtpuW+jDHpgLHplpPku6XlhoXjgavlrabpmaLkuovl" +
  "i5nlsYDjgb7jgafjgZTpgKPntaHjgY/jgaDjgZXjgYTjgIIKCuKWoCDkuZfppqzjg5bjg7zjg4Tjg7vjg5jjg6vjg6Hjg4Pjg4jjgavjgaTjgYTjgaYK5Yi2" +
  "5pyN44Go5ZCI44KP44Gb44Gm44CB5LmX6aas44OW44O844OE44O744OY44Or44Oh44OD44OI44Gu44K144Kk44K644KC44Oe44Kk44Oa44O844K444Gr44Gm" +
  "44GU55m76Yyy44GP44Gg44GV44GE44CCCuOCteOCpOOCuuWxlemWi+OBr+ODluODvOODhDogMjMuMGNt44CcMjguMGNtICgwLjVjbeWIu+OBvynjgIHjg5jj" +
  "g6vjg6Hjg4Pjg4g6IFMvTS9ML1hMIOOBp+OBmeOAggo=";

const ENROLLMENT_FLOW_B64 =
  "5YWl5a2m44G+44Gn44Gu5rWB44KMICjmnbHplqLmnbHppqzkuovlrabpmaIpCgrlkIjmoLzpgJrnn6XlvozjgIHlhaXlrablvI/jgb7jgafjga7mtYHjgozj" +
  "ga/ku6XkuIvjga7jgajjgYrjgorjgafjgZnjgIIKCjEuIOWQiOWQpueiuuiqjeODu+WQiOagvOmAmuefpeOBruWPl+mgmAogICDjg57jgqTjg5rjg7zjgrjj" +
  "gIzlkIjlkKbnorroqo3jgI3jg5rjg7zjgrjjgIHjgYrjgojjgbPjg6Hjg7zjg6vjg7tMSU5F44Gr44Gm44GU5qGI5YaF44GX44G+44GZ44CCCgoyLiDlhaXl" +
  "rabmiYvntprjgY3mm7jpoZ7jga7mj5Dlh7oKICAg44Oe44Kk44Oa44O844K444CM5YWl5a2m5omL57aa44GN44CN44Oa44O844K444KI44KK44CB5pys5Lq6" +
  "56K66KqN5pu46aGeKOmhlOWGmeecn+ODu+S/nemZuuiovOODu+ODnuOCpOODiuODs+ODkOODvCnjga7nlLvlg4/jgpLjgqLjg4Pjg5fjg63jg7zjg4njgZfj" +
  "gabjgY/jgaDjgZXjgYTjgIIKCjMuIOWItuacjeODu+ijheWFt+OBruOCteOCpOOCuueZu+mMsgogICDliLbmnI3jg7vkuZfppqzjg5bjg7zjg4Tjg7vjg5jj" +
  "g6vjg6Hjg4Pjg4jjga7jgrXjgqTjgrrjgpLjg57jgqTjg5rjg7zjgrjjgojjgorjgZTnmbvpjLLjgY/jgaDjgZXjgYTjgIIKCjQuIOe3iuaApemAo+e1oeWF" +
  "iOODu+S/neiovOS6uuaDheWgseOBruOBlOeZu+mMsgoKNS4g5YGl5bq35oOF5aCx44Gu55Sz5ZGKCiAgIOOCouODrOODq+OCruODvOODu+W4uOWCmeiWrOOD" +
  "u+aMgeeXheetieOAgeWuieWFqOeiuuS/neOBruOBn+OCgeOBlOeUs+WRiuOCkuOBiumhmOOBhOOBl+OBvuOBmeOAggoKNi4g5YWl5a2m6KaP57SE44G444Gu" +
  "5ZCM5oSP44O76Zu75a2Q572y5ZCNCgo3LiDlhaXlrabph5Hjg7vliLbmnI3ku6Pjg7vmlZnmnZDosrvjga7jgYrmlK/miZXjgYQKICAg44Kv44Os44K444OD" +
  "44OI44Kr44O844OJ44G+44Gf44Gv6YqA6KGM5oyv6L6844Gr44Gm44GK5omL57aa44GN44GP44Gg44GV44GE44CCCgo4LiDlrabnlKjlk4Hjg7vliLbmnI3j" +
  "ga7jgYrlj5fjgZHlj5bjgooKICAg44GU55m76Yyy44GE44Gf44Gg44GE44Gf44K144Kk44K644KS44KC44Go44Gr5omL6YWN44GX44CB5YWl5a2m5byP5b2T" +
  "5pel44G+44Gn44Gr44GK5rih44GX44GE44Gf44GX44G+44GZ44CCCgo5LiDlhaXlrablvI/jg7vlhaXlr64KICAg5YWl5a2m5byP5b2T5pel44CB5oyH5a6a" +
  "44Gu5pmC6ZaT44G+44Gn44Gr44GK6LaK44GX44GP44Gg44GV44GE44CC5YWl5a+u44Gu6Kmz57Sw44Gv5Yil6YCU44GU5qGI5YaF44GE44Gf44GX44G+44GZ" +
  "44CCCgrjgZnjgbnjgabjga7miYvntprjgY3jga/jg57jgqTjg5rjg7zjgrjjga7jgIzlhaXlrabmiYvntprjgY3jgI3jg5rjg7zjgrjjgYvjgonpgLLjgoHj" +
  "gabjgYTjgZ/jgaDjgZHjgb7jgZnjgIIK44GU5LiN5piO44Gq54K544GM44GC44KM44Gw44CB44GE44Gk44Gn44KC5a2m6Zmi5LqL5YuZ5bGA44G+44Gn44GK" +
  "5ZWP44GE5ZCI44KP44Gb44GP44Gg44GV44GE44CCCg==";

const DECISION_ATTACHMENTS: Record<string, EmailAttachment> = {
  result_letter: { filename: "合否通知書.txt", content: Buffer.from(RESULT_LETTER_B64, "base64") },
  tuition_guide: { filename: "学費案内.txt", content: Buffer.from(TUITION_GUIDE_B64, "base64") },
  school_rules: { filename: "入学規約.txt", content: Buffer.from(SCHOOL_RULES_B64, "base64") },
  supplies_list: { filename: "学用品一覧.txt", content: Buffer.from(SUPPLIES_LIST_B64, "base64") },
  uniform_guide: { filename: "制服案内.txt", content: Buffer.from(UNIFORM_GUIDE_B64, "base64") },
  enrollment_flow: { filename: "入学までの流れ.txt", content: Buffer.from(ENROLLMENT_FLOW_B64, "base64") },
};

/** 指定した書類キー(DECISION_DOCUMENTSのkeyと一致)の同封書類を添付ファイルとして返す */
export function decisionAttachments(keys: string[]): EmailAttachment[] {
  return keys.map((k) => DECISION_ATTACHMENTS[k]).filter((a): a is EmailAttachment => !!a);
}
