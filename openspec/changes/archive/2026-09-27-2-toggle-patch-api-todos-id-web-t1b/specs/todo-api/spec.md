## ADDED Requirements

### Requirement: todo の完了状態の変更
`PATCH /api/todos/:id` は JSON の body `{"done": <真偽値>}` を受け、`id` の todo の `done` をその値にして、status 200 で更新後の todo を返さなければならない(SHALL)。body の `done` 以外の key は無視し、題名を変えてはならない(MUST NOT)。変えた状態は以後の `GET /api/todos` に反映されなければならない(SHALL)。

#### Scenario: 完了にする
- **WHEN** `POST /api/todos` で「牛乳を買う」を作り、その `id` に `PATCH /api/todos/:id` で `{"done":true}` を送る
- **THEN** status は 200 で、body は同じ `id`、`title` が `"牛乳を買う"`、`done` が `true` の todo である

#### Scenario: 未完了に戻す
- **WHEN** `done` が `true` の todo に `PATCH /api/todos/:id` で `{"done":false}` を送る
- **THEN** status は 200 で、body はその todo の `done` が `false` のものである

#### Scenario: 同じ値の再送
- **WHEN** `done` が `false` の todo に `{"done":false}` を送る
- **THEN** status は 200 で、body の `done` は `false` のままである

#### Scenario: 一覧への反映
- **WHEN** 「牛乳を買う」「掃除する」を作り、「掃除する」だけに `{"done":true}` を送った後に `GET /api/todos` を呼ぶ
- **THEN** 一覧は「牛乳を買う」(`done` が `false`)「掃除する」(`done` が `true`)をこの順に含み、件数は 2 のままである

#### Scenario: done 以外の key の無視
- **WHEN** 「牛乳を買う」の todo に `{"done":true,"title":"掃除する","id":999}` を送る
- **THEN** status は 200 で、返る todo と以後の一覧の中のその todo は `id` と `title`「牛乳を買う」が変わらず、`done` が `true` である

### Requirement: 不正な完了の切り替えの拒否
`PATCH /api/todos/:id` は、`id` が正の整数の 10 進表記でないか、その `id` の todo が無いとき status 404 で拒まなければならない(SHALL)。`id` の todo が在り、body が JSON の object として読めないか、`done` が無いか、`done` が真偽値でないときは status 400 で拒まなければならない(SHALL)。`id` の判定を body の判定より先に行う(SHALL)。拒んだとき todo を変えてはならず(MUST NOT)、body は `error`(文字列)を持つ JSON の object でなければならない(SHALL)。

#### Scenario: 存在しない id の拒否
- **WHEN** todo が 1 件(`id` が n)在る状態で、`PATCH /api/todos/<n+1>` に `{"done":true}` を送る
- **THEN** status は 404 で、body は `error` を持ち、一覧は送る前と同じである

#### Scenario: 数値として読めない id の拒否
- **WHEN** `PATCH /api/todos/abc`、`/api/todos/1.5`、`/api/todos/0`、`/api/todos/-1` にそれぞれ `{"done":true}` を送る
- **THEN** どれも status は 404 で、body は `error` を持ち、一覧は送る前と同じである

#### Scenario: 存在しない id と不正な body
- **WHEN** 存在しない `id` に `{}` を送る
- **THEN** status は 404 である(`id` の判定が先)

#### Scenario: done の無い body の拒否
- **WHEN** 在る todo に `{}` と `{"title":"掃除する"}` をそれぞれ送る
- **THEN** どちらも status は 400 で、body は `error` を持ち、その todo の `title` と `done` は送る前と同じである

#### Scenario: 真偽値でない done の拒否
- **WHEN** 在る todo に `{"done":"true"}`、`{"done":1}`、`{"done":0}`、`{"done":null}` をそれぞれ送る
- **THEN** どれも status は 400 で、body は `error` を持ち、その todo の `done` は送る前と同じである

#### Scenario: JSON でない完了の body の拒否
- **WHEN** 在る todo に JSON として読めない文字列 `done=true`、または JSON の object でない値 `true` と `[true]` をそれぞれ送る
- **THEN** どれも status は 400 で、body は `error` を持ち、その todo の `done` は送る前と同じである
