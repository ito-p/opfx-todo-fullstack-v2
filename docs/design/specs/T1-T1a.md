# T1 todo 一覧・T1a 0 件——Figma の実値(frame 2:2・2:16、480×400)

出所: Figma `<figma-file-key>` の frame `2:2`(T1 todo 一覧)と `2:16`(T1a todo 一覧(0 件))を MCP `get_design_context`・`get_metadata` で読んだ値(2026-09-27)。書体はどれも Noto Sans JP、行送りは normal。

## 縦の並び(T1)

面は白 #FFFFFF。内側 24(上下左右)、領域の間(縦)gap 16、左寄せ。中身の幅 432。

| 領域 | 位置(frame 内) | 高さ | 中身 |
|---|---|---|---|
| title | (24, 24) | 29 | 文字「todo」24px Bold(700)#171717 |
| add-form | (24, 69) | 40 | 横並び gap 8: title-input(伸びる、352)+ add-button(72) |
| todo-list | (24, 125) | 44 × 行数 | todo-item を gap 0 で縦に積む |

## add-form

- **title-input**(2:5): 高さ 40、幅は残り(flex 1、432 − 8 − 72 = 352)、面 白、枠 1px #D4D4D4、角丸 6、左右の内側 12、中身は縦中央。プレースホルダー「題名を入力」16px Regular #A3A3A3。
- **add-button**(2:7): 高さ 40、左右の内側 20(幅 72)、面 #171717、角丸 6、文字「追加」16px Medium(500)白、縦横中央。

## todo-list / todo-item(2:10・2:12・2:14)

- 行: 高さ 44、幅 432、左右の内側 12、横並び gap 12、縦中央、面 白、下に 1px #E5E5E5 の線。
- **checkbox(未完了)**(6:2): 20×20、面 白、枠 1px #A3A3A3、角丸 4、印なし。
- **todo-title**(2:11): 16px Regular #171717、残りの幅に伸びる(314)、折り返す。
- **delete-button**(8:2): 高さ 28、左右の内側 10(幅 50)、面 白、枠 1px #D4D4D4、角丸 6、文字「削除」14px Regular #737373、縦横中央。
- frame の見本の題名: 「牛乳を買う」「掃除する」「本を返す」。

## T1a の差分(0 件)

T1 との違いは todo-list の代わりに empty-message があることだけ(title・add-form は同じ値)。

- **empty-message**(2:23): (24, 125)、幅 432(いっぱい)、高さ 120、面 白、中身を縦横中央。
- **empty-text**(2:24): 「まだ todo がありません」14px Regular #737373。

## 実装への含意

- frame の高さ 400 は見本の器の大きさで、画面は中身の高さに従って伸びる(行が増えれば下へ伸びる)。幅は 480 を上限に中央へ置く。
- 書体は `"Noto Sans JP", sans-serif` と名指すだけで web font は読み込まない(design.md の D8)。
