# QA regression suite

`lifecycle-check.js` walks the whole money-and-identity journey against a
running dev server and asserts the guarantees that must never regress.

## Run it

Build a mirror outside the mounted folder (the mount blocks `.next` writes),
then start the server and run the suite **in the same shell**, because a
background server does not survive between separate tool calls.

```bash
SRC=~/Developer/"Content Karkhana"/precas-mvp
rsync -a --exclude node_modules --exclude .next --exclude .git \
      --exclude .env.local "$SRC/" /tmp/precas-build/   # never --delete-excluded
cp -r "$SRC/node_modules" /tmp/precas-build/node_modules  # symlinks break Turbopack
cd /tmp/precas-build
(npx next dev -p 3012 &) ; sleep 12
QA_PORT=3012 node qa/lifecycle-check.js
```

## Traps that produced false results before

1. **Remove `.env.local` from the mirror.** With real Firebase config present the
   dev sign-in token is correctly refused (the production guard), and every test
   downstream fails for the wrong reason.
2. **Carry cookies across the whole journey.** `session/create` sets the owner
   cookie, not `auth/firebase`. Reading only the auth response's cookie makes
   four unrelated tests fail with 404. There is a cookie jar in the script now.

3. **Use `next dev`, not `next start`.** `next start` sets NODE_ENV=production,
   which correctly disables the `dev:` sign-in token. Everything then fails for
   the wrong reason.
4. **Do not depend on the client's secrets.** The suite used `superKey: 'sup-x'`,
   which only passed because it was reading the real `.env.local`. It now uses
   the documented dev fallback `super-dev`.
5. **Never `rsync --delete-excluded` into the mirror.** It deletes `node_modules`,
   and re-copying 938 MB takes minutes.

A further trap, for anything asserting on rendered HTML: React inserts
`<!-- -->` between adjacent text nodes, so `body.includes("NPR 449")` is a false
negative. Strip comments and tags first.
