# T1b todo 一覧(完了あり)——Figma の実値(frame 5:2、480×400)

出所: Figma `r47Wd87UG3V9SxkuKAKce2` の frame `5:2`(T1b todo 一覧(完了あり))と、その中の `5:16`(checkbox(完了))を MCP `get_design_context`・`get_metadata` で読んだ値(2026-09-27)。書体はどれも Noto Sans JP、行送りは normal。基準の T1 は `T1-T1a.md`。

## 縦の並び

T1 と同じ(面 白 #FFFFFF、内側 24、領域の間 gap 16、中身の幅 432)。

| 領域 | 位置(frame 内) | 高さ | 中身 |
|---|---|---|---|
| title(5:3) | (24, 24) | 29 | T1 と同じ |
| add-form(5:4) | (24, 69) | 40 | T1 と同じ(title-input 5:5、add-button 5:7) |
| todo-list(5:9) | (24, 125) | 132(44 × 3) | todo-item 5:10・5:12・5:14 を gap 0 で縦に積む |

## T1 との差分(完了の行)

T1 との違いは 1 行目 todo-item(5:10)が完了の行であることだけ。行の大きさ・内側・gap・下の線、2・3 行目(5:12・5:14)、delete-button(8:8・8:10・8:12)は T1 と同じ値。

- **checkbox(完了)**(5:16): 行の中の (12, 11.5)、20×20。SVG 1 枚で、枠は無い。
  - 面: 矩形 20×20、角丸 4、塗り #171717。
  - 印(`check`): path `M5 10L8.5 13.5L15 6.5`、線 白(#FFFFFF)、太さ 2、端 round、角 round、塗りなし。
- **todo-title**(5:11): 行の中の (44, 12)、幅 314(残りの幅に伸びる)。16px Regular、色 #A3A3A3、取り消し線(line-through、solid)。
- 未完了の行の checkbox(未完了)(5:18・5:19)は T1 の checkbox(未完了)と同じ(20×20、面 白、枠 1px #A3A3A3、角丸 4、印なし)。
- frame の見本: 1 行目「牛乳を買う」(完了)、2 行目「掃除する」、3 行目「本を返す」(どちらも未完了)。

## 実装への含意

- 完了かどうかは行ごとの状態で、T1b は「完了の行が 1 つ以上ある T1」。行の見た目は todo の `done` で決め、完了の行を並べ替えない(frame でも 1 行目のまま)。
- checkbox(完了)の SVG は Figma の asset をそのまま `web/src/assets/checkbox-done.svg` に置き、`.checkbox:checked` の背景に敷く(枠は消す)。描き直さない。
- 状態は class を足さず、チェックボックスは `:checked`、題名は行の `data-done="true"` で表す(README の命名の規則)。
