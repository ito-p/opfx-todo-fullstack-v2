# todo-api Specification

## Purpose
todo の一覧と追加を HTTP で扱う API。web と後の機能(完了の切り替え・削除)が共通に使う todo の形と、題名の検証の規則を定める。

## Requirements

### Requirement: todo の形
API が返す todo は `id`(整数)・`title`(文字列)・`done`(真偽値)の 3 つの項目を持つ JSON の object でなければならない(SHALL)。

#### Scenario: 作った直後の todo の形
- **WHEN** `POST /api/todos` に `{"title":"牛乳を買う"}` を送る
- **THEN** 応答の body は `id` が整数、`title` が `"牛乳を買う"`、`done` が `false` の object である

### Requirement: todo の一覧
`GET /api/todos` は status 200 で、保存されているすべての todo を作られた順(古いものが先)に並べた JSON の配列を返さなければならない(SHALL)。

#### Scenario: 0 件の一覧
- **WHEN** todo が 1 件も無い状態で `GET /api/todos` を呼ぶ
- **THEN** status は 200 で、body は空の配列 `[]` である

#### Scenario: 追加した todo を含む一覧
- **WHEN** `POST /api/todos` で「牛乳を買う」「掃除する」の順に 2 件作った後に `GET /api/todos` を呼ぶ
- **THEN** status は 200 で、body はその 2 件を「牛乳を買う」「掃除する」の順に含む配列であり、各要素は POST が返した todo と同じ `id`・`title`・`done` を持つ

### Requirement: todo の追加
`POST /api/todos` は JSON の body `{"title": <文字列>}` を受け、題名の前後の空白を取り除いた値を題名として `done` が `false` の todo を 1 件作り、status 201 で作った todo を返さなければならない(SHALL)。

#### Scenario: 題名を送った追加
- **WHEN** `POST /api/todos` に `{"title":"牛乳を買う"}` を送る
- **THEN** status は 201 で、body は `title` が `"牛乳を買う"`、`done` が `false` の todo であり、以後の `GET /api/todos` にその todo が含まれる

#### Scenario: 前後の空白の除去
- **WHEN** `POST /api/todos` に `{"title":"  牛乳を買う \t"}` を送る
- **THEN** status は 201 で、返る todo と以後の一覧の中のその todo の `title` はともに `"牛乳を買う"` である

#### Scenario: 題名の中の空白の保持
- **WHEN** `POST /api/todos` に `{"title":" 本 を 返す "}` を送る
- **THEN** 返る todo の `title` は `"本 を 返す"` である(前後だけを除き、中の空白は残す)

### Requirement: 不正な題名の拒否
`POST /api/todos` は、題名が無い、文字列でない、空、または前後の空白を除くと空になる body、および JSON として読めない body を status 400 で拒まなければならない(SHALL)。拒んだとき todo を作ってはならず(MUST NOT)、body は `error`(文字列)を持つ JSON の object でなければならない(SHALL)。

#### Scenario: 空の題名の拒否
- **WHEN** `POST /api/todos` に `{"title":""}` を送る
- **THEN** status は 400 で、body は `error` を持ち、`GET /api/todos` の件数は送る前と変わらない

#### Scenario: 空白だけの題名の拒否
- **WHEN** `POST /api/todos` に `{"title":"   "}`(半角の空白だけ)と `{"title":" \t\n "}`(空白・タブ・改行だけ)をそれぞれ送る
- **THEN** どちらも status は 400 で、body は `error` を持ち、`GET /api/todos` の件数は送る前と変わらない

#### Scenario: 題名の無い body の拒否
- **WHEN** `POST /api/todos` に `{}` を送る
- **THEN** status は 400 で、body は `error` を持ち、`GET /api/todos` の件数は送る前と変わらない

#### Scenario: 文字列でない題名の拒否
- **WHEN** `POST /api/todos` に `{"title":123}`、`{"title":null}`、`{"title":["a"]}` をそれぞれ送る
- **THEN** どれも status は 400 で、body は `error` を持ち、`GET /api/todos` の件数は送る前と変わらない

#### Scenario: JSON でない body の拒否
- **WHEN** `POST /api/todos` に JSON として読めない文字列 `title=a`、または JSON の object でない値 `"a"` を送る
- **THEN** どちらも status は 400 で、body は `error` を持ち、`GET /api/todos` の件数は送る前と変わらない
