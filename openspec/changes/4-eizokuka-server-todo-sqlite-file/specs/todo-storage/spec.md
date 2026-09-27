# Spec Delta

## Purpose

server が todo を SQLite の file に保存し、起動時にそこから復元するための規則。保存する file の場所の決め方(環境変数 `TODOS_DB_PATH` と既定の path)、無い file と壊れた file を見つけたときの起動の仕方を定める。

## ADDED Requirements

### Requirement: 再起動をまたぐ todo の保存
server は todo の追加・完了状態の変更・削除の結果を保存の file に書き、次に同じ file で起動したとき、`GET /api/todos` が停止の前と同じ todo(同じ `id`・`title`・`done`、同じ順)を返さなければならない(SHALL)。再起動の後に作る todo の `id` は、それまでに作ったどの todo(消したものを含む)の `id` よりも大きくなければならない(SHALL)。

#### Scenario: 再起動の後の追加した todo
- **WHEN** `POST /api/todos` で「牛乳を買う」「掃除する」をこの順に作り、server を止めて同じ file で起動し直した後に `GET /api/todos` を呼ぶ
- **THEN** status は 200 で、body は停止の前の POST が返した 2 件の todo をこの順に、同じ `id`・`title`・`done` で含む

#### Scenario: 再起動の後の完了状態
- **WHEN** 「牛乳を買う」「掃除する」を作り、「掃除する」に `PATCH /api/todos/:id` で `{"done":true}` を送り、server を止めて同じ file で起動し直した後に `GET /api/todos` を呼ぶ
- **THEN** 一覧は「牛乳を買う」(`done` が `false`)「掃除する」(`done` が `true`)をこの順に含む

#### Scenario: 再起動の後の削除
- **WHEN** 「牛乳を買う」「掃除する」「本を返す」を作り、「掃除する」に `DELETE /api/todos/:id` を送り、server を止めて同じ file で起動し直した後に `GET /api/todos` を呼ぶ
- **THEN** 一覧は「牛乳を買う」「本を返す」の 2 件をこの順に含み、「掃除する」は含まない

#### Scenario: 再起動の後の id の続き
- **WHEN** todo を 2 件作り、`id` の大きい方を `DELETE` で消し、server を止めて同じ file で起動し直した後に `POST /api/todos` で 1 件作る
- **THEN** 新しい todo の `id` は消した todo の `id` よりも大きい

### Requirement: 保存の file の場所
server は環境変数 `TODOS_DB_PATH` が空でない文字列のとき、その path の file に todo を保存しなければならない(SHALL)。相対の path は server を起動した cwd を基準に読む(SHALL)。`TODOS_DB_PATH` が無いか空の文字列のときは、起動した cwd に依らず repo の `server/data/todos.sqlite` に保存しなければならない(SHALL)。

#### Scenario: TODOS_DB_PATH の指す file への保存
- **WHEN** `TODOS_DB_PATH` に一時 directory の中の `todos-test.sqlite` を渡して起動し、`POST /api/todos` で「牛乳を買う」を作る
- **THEN** その path に file が在り、同じ path で起動し直した server の一覧に「牛乳を買う」が含まれる

#### Scenario: 相対の TODOS_DB_PATH
- **WHEN** 一時 directory を cwd とし、`TODOS_DB_PATH` に `sub/todos.sqlite` を渡して保存の path を決める
- **THEN** 保存の path は `<一時 directory>/sub/todos.sqlite` である

#### Scenario: 既定の保存の file
- **WHEN** `TODOS_DB_PATH` を渡さずに保存の path を決める
- **THEN** 保存の path は repo の `server/data/todos.sqlite` の絶対 path である

#### Scenario: cwd に依らない既定の保存の file
- **WHEN** `TODOS_DB_PATH` を渡さずに、cwd を repo の根・`server/`・一時 directory にしてそれぞれ保存の path を決める
- **THEN** どれも repo の `server/data/todos.sqlite` の同じ絶対 path である

#### Scenario: 空の TODOS_DB_PATH
- **WHEN** `TODOS_DB_PATH` に空の文字列を渡して保存の path を決める
- **THEN** 保存の path は `TODOS_DB_PATH` を渡さないときと同じ repo の `server/data/todos.sqlite` である

### Requirement: 無い保存の file
保存の path に file が無いとき、server はそこに空の DB を作って起動し、`GET /api/todos` は空の配列を返さなければならない(SHALL)。親の directory が無いときは、途中の directory も含めて作らなければならない(SHALL)。長さ 0 の file は空の DB として扱い、退避してはならない(MUST NOT)。

#### Scenario: 無い file からの起動
- **WHEN** 一時 directory の中の無い file の path を `TODOS_DB_PATH` に渡して起動し、`GET /api/todos` を呼ぶ
- **THEN** status は 200 で、body は空の配列 `[]` であり、その path に file ができている

#### Scenario: 無い親 directory の作成
- **WHEN** 一時 directory の中の、まだ無い 2 段の directory の下の path(`<一時 directory>/a/b/todos.sqlite`)を `TODOS_DB_PATH` に渡して起動する
- **THEN** 起動は成功し、`a/b/` の directory と `todos.sqlite` の file ができ、`GET /api/todos` は空の配列を返す

#### Scenario: 長さ 0 の file からの起動
- **WHEN** 長さ 0 の file の path を `TODOS_DB_PATH` に渡して起動し、`GET /api/todos` を呼ぶ
- **THEN** body は空の配列 `[]` で、同じ directory に `.corrupt-` を含む名前の file は作られず、その path に「牛乳を買う」を `POST` した後に起動し直しても一覧に残る

### Requirement: 壊れた保存の file の退避
保存の path の file が SQLite の DB として読めないとき(壊れた file)、server はその file の名前を `<元の file の名前>.corrupt-<時刻>` に変えて同じ directory に退避し、元の path に新しい空の DB を作って起動しなければならない(SHALL)。`<時刻>` は UTC の `YYYYMMDDTHHmmssSSSZ`(例 `20260927T031500123Z`)とし、その名前の file が既に在れば `-1`、`-2` … を末尾に足して、既に在る file と重ならない名前にしなければならない(SHALL)。退避した file の中身を変えたり消したりしてはならない(MUST NOT)。退避したとき、退避先の path を含む 1 行を標準エラーに書かなければならない(SHALL)。path に在るものが通常の file でない(例: directory)とき、および file が在っても SQLite の DB として読めないこと以外の理由で開けないときは、退避せずに起動を失敗させなければならない(SHALL)。

#### Scenario: 壊れた file の退避
- **WHEN** 中身が文字列「これは SQLite ではない」の file の path を `TODOS_DB_PATH` に渡して起動し、`GET /api/todos` を呼ぶ
- **THEN** 起動は成功し、body は空の配列 `[]` で、同じ directory に `todos.sqlite.corrupt-<時刻>`(`<時刻>` は 8 桁の数字・`T`・9 桁の数字・`Z` の形)の file が 1 つでき、元の path は新しい空の DB である

#### Scenario: 退避した file の中身の保持
- **WHEN** 4096 byte の決まった bytes 列(SQLite の頭を持たない)を書いた file の path を `TODOS_DB_PATH` に渡して起動する
- **THEN** 退避先の file の中身は起動の前の 4096 byte と 1 byte も違わない

#### Scenario: 退避の後の保存
- **WHEN** 壊れた file を退避して起動した server で「牛乳を買う」を `POST` し、同じ path で起動し直す
- **THEN** 一覧は「牛乳を買う」の 1 件を含み、新しい退避の file は増えない

#### Scenario: 同じ時刻の退避名の衝突
- **WHEN** 退避の時刻が `20260927T031500123Z` のとき、同じ directory に `todos.sqlite.corrupt-20260927T031500123Z` と `todos.sqlite.corrupt-20260927T031500123Z-1` が既に在る状態で壊れた file を退避する
- **THEN** 退避先は `todos.sqlite.corrupt-20260927T031500123Z-2` で、既に在った 2 つの file の中身は変わらない

#### Scenario: 退避の標準エラーへの記録
- **WHEN** 壊れた file を退避して起動する
- **THEN** 標準エラーに退避先の絶対 path を含む 1 行が書かれる

#### Scenario: directory を指す TODOS_DB_PATH
- **WHEN** 既に在る directory の path を `TODOS_DB_PATH` に渡して起動する
- **THEN** 起動は error で失敗し、その directory は名前も中身も変わらず、`.corrupt-` を含む名前の file も directory も作られない
