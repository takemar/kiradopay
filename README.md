# Kiradopay

参照： https://blog.takemaro.com/posts/2021/12/28-kiradopay

## デプロイ方法

### 1. Node.js関係

Node.jsをNVMなどの好みの方法でインストールし，yarnのインストール（普通は `$ npm install -g yarn` ）もしたら，普通に

```
$ yarn install
```

でOKです．

### 2. データベース関係

パッケージマネージャを使うなどしてSQLite3をインストールしておきます．

```
$ yarn prisma migrate deploy
```

で `db/db.sqlite3` が生えます．

SQLiteに特有の機能は使っていないので， `db/prisma/schema.prisma` のdatasourceブロックを書き換えれば他のデータベースでもいける可能性がありますが，試していません．

GUIでイベント（レジ画面1個に対応するオブジェクト）を追加する機能がまだないので， `$ sqlite3 db/db.sqlite3` コマンドでデータベースに入って直接追加します． `events` テーブルと `items` テーブルにレコードを投入してください．テーブル定義は `db/prisima/schema.prisma` ファイルを見るかSQLiteの `.schema` コマンドを打って確認してください．

### 3. 不足ファイルの追加

必要であるがリポジトリに含まれていないファイルがあるため，手動で追加します．

まず， `src/names.json` は，各クライアントに割り当てられる名前のリストです．ライセンスの都合（婉曲表現）でリポジトリに含まれていません．型が `string[]` であるようなJSONファイルであればなんでもよいので，適当に用意して配置します．

次に， `src/calculator.ts` は，頒布価格を定義するファイルです．WebAssemblyを用いて（曲がりなりにも）GUIから設定できるようにする計画がありますが，まだないので，ソースコードに直接記述するようになっています． `src/CalculatorInterface.ts` に定義されている `CalculatorFactory` インタフェースを実装した関数をdefault exportしてください．

### 4. Next.js関係

ここまでできたら，普通に

```
$ yarn build
```

でビルドした上で

```
$ yarn start
```

とやればサーバが走ります．ポートはデフォルトでは3000番です． `PORT` 環境変数で変えられます．必要に応じて `.env.local` で定義してください．

あとはnginxなりApacheからリバースプロキシしてやると良いでしょう．その際は，通常のHTTPだけでなくWebSocketもあるため https://nginx.org/en/docs/http/websocket.html あるいは https://httpd.apache.org/docs/2.4/mod/mod_proxy_wstunnel.html をやってあげる必要があることに注意してください．

### 5. その他

注意点として，ブラウザ側ではIndexedDBにセッションを保存しています．現状，データベースとブラウザのセッションに不整合がある場合にバグるという問題があるので，データベースを吹き飛ばした場合はホスト名を変えるかIndexedDBを吹き飛ばすかする必要があります．

それから，デバッグでは `$ yarn build` と `$ yarn start` の代わりに

```
$ yarn dev
```

とできます．最適化が外れる代わりにhot reloadが有効になるとかな感じです．
