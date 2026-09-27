## ADDED Requirements

### Requirement: todo の削除
`DELETE /api/todos/:id` は、`id` の todo が在ればそれを消し、status 204 で body の無い応答を返さなければならない(SHALL)。消した todo は以後の `GET /api/todos` に含まれてはならず(MUST NOT)、他の todo とその順は変えてはならない(MUST NOT)。`id` が先頭に 0 の無い正の整数の 10 進表記でないか、その `id` の todo が無いとき(既に消した todo を含む)は status 404 で拒み、body は `error`(文字列)を持つ JSON の object でなければならない(SHALL)。拒んだとき todo を変えてはならない(MUST NOT)。

#### Scenario: 存在する todo の削除
- **WHEN** `POST /api/todos` で「牛乳を買う」を作り、その `id` に `DELETE /api/todos/:id` を送る
- **THEN** status は 204 で、body は空(長さ 0)である

#### Scenario: 削除した todo の一覧からの消去
- **WHEN** 「牛乳を買う」「掃除する」「本を返す」をこの順に作り、「掃除する」の `id` に `DELETE` を送った後に `GET /api/todos` を呼ぶ
- **THEN** 一覧は「牛乳を買う」「本を返す」の 2 件をこの順に含み、「掃除する」は含まない

#### Scenario: 最後の 1 件の API での削除
- **WHEN** todo が 1 件だけ在る状態でその `id` に `DELETE` を送った後に `GET /api/todos` を呼ぶ
- **THEN** status は 200 で、body は空の配列 `[]` である

#### Scenario: 存在しない id の削除
- **WHEN** todo が 1 件(`id` が n)在る状態で、`DELETE /api/todos/<n+1>` を送る
- **THEN** status は 404 で、body は `error` を持ち、一覧は送る前と同じである

#### Scenario: 同じ id の 2 回目の削除
- **WHEN** 在る todo の `id` に `DELETE` を 2 回続けて送る
- **THEN** 1 回目の status は 204、2 回目の status は 404 で、2 回目の body は `error` を持つ

#### Scenario: 数値として読めない id の削除
- **WHEN** todo が 1 件在る状態で、`DELETE /api/todos/abc`、`/api/todos/1.5`、`/api/todos/0`、`/api/todos/-1` をそれぞれ送る
- **THEN** どれも status は 404 で、body は `error` を持ち、一覧は送る前と同じである

#### Scenario: 先頭に 0 の付いた id の削除
- **WHEN** todo が 1 件(`id` が 1)在る状態で、`DELETE /api/todos/01` と `/api/todos/001` をそれぞれ送る
- **THEN** どちらも status は 404 で、body は `error` を持ち、`id` が 1 の todo は一覧に残る

## MODIFIED Requirements

### Requirement: 不正な完了の切り替えの拒否
`PATCH /api/todos/:id` は、`id` が先頭に 0 の無い正の整数の 10 進表記でないか、その `id` の todo が無いとき status 404 で拒まなければならない(SHALL)。`id` の todo が在り、body が JSON の object として読めないか、`done` が無いか、`done` が真偽値でないときは status 400 で拒まなければならない(SHALL)。`id` の判定を body の判定より先に行う(SHALL)。`id` の判定の後、完了状態を変える前にその todo が消えていたときも status 404 で拒まなければならず(SHALL)、status 500 を返してはならない(MUST NOT)。拒んだとき todo を変えてはならず(MUST NOT)、body は `error`(文字列)を持つ JSON の object でなければならない(SHALL)。

#### Scenario: 存在しない id の拒否
- **WHEN** todo が 1 件(`id` が n)在る状態で、`PATCH /api/todos/<n+1>` に `{"done":true}` を送る
- **THEN** status は 404 で、body は `error` を持ち、一覧は送る前と同じである

#### Scenario: 数値として読めない id の拒否
- **WHEN** `PATCH /api/todos/abc`、`/api/todos/1.5`、`/api/todos/0`、`/api/todos/-1` にそれぞれ `{"done":true}` を送る
- **THEN** どれも status は 404 で、body は `error` を持ち、一覧は送る前と同じである

#### Scenario: 存在しない id と不正な body
- **WHEN** 存在しない `id` に `{}` を送る
- **THEN** status は 404 である(`id` の判定が先)

#### Scenario: 先頭に 0 の付いた id の拒否
- **WHEN** todo が 1 件(`id` が 1)在る状態で、`PATCH /api/todos/01` と `/api/todos/001` にそれぞれ `{"done":true}` を送る
- **THEN** どちらも status は 404 で、body は `error` を持ち、`id` が 1 の todo の `done` は送る前と同じである

#### Scenario: done の無い body の拒否
- **WHEN** 在る todo に `{}` と `{"title":"掃除する"}` をそれぞれ送る
- **THEN** どちらも status は 400 で、body は `error` を持ち、その todo の `title` と `done` は送る前と同じである

#### Scenario: 真偽値でない done の拒否
- **WHEN** 在る todo に `{"done":"true"}`、`{"done":1}`、`{"done":0}`、`{"done":null}` をそれぞれ送る
- **THEN** どれも status は 400 で、body は `error` を持ち、その todo の `done` は送る前と同じである

#### Scenario: JSON でない完了の body の拒否
- **WHEN** 在る todo に JSON として読めない文字列 `done=true`、または JSON の object でない値 `true` と `[true]` をそれぞれ送る
- **THEN** どれも status は 400 で、body は `error` を持ち、その todo の `done` は送る前と同じである

#### Scenario: PATCH の途中の削除
- **WHEN** 在る todo に `PATCH /api/todos/:id` で `{"done":true}` を送り、server が `id` を判定した後、body を読み終えて完了状態を変える前に、その todo が `DELETE /api/todos/:id` で消される
- **THEN** PATCH の status は 404(500 ではない)で、body は `error` を持ち、以後の `GET /api/todos` にその todo は含まれない
