# QA regression suite

`lifecycle-check.js` walks the whole money-and-identity journey against a
running dev server and asserts the guarantees that must never regress.

## Run it

```bash
/tmp/sync.sh
cd /tmp/precas && rm -f .env.local        # TEST MIRROR ONLY, never the source
export SESSION_SECRET=test-secret SUPER_ADMIN_PASSCODE=sup-x OWNER_ACCESS_KEY=own-x
(npx next dev -p 3012 &) ; sleep 25
node qa/lifecycle-check.js
```

## Two traps that produced false results before

1. **Remove `.env.local` from the mirror.** With real Firebase config present the
   dev sign-in token is correctly refused (the production guard), and every test
   downstream fails for the wrong reason.
2. **Carry cookies across the whole journey.** `session/create` sets the owner
   cookie, not `auth/firebase`. Reading only the auth response's cookie makes
   four unrelated tests fail with 404. There is a cookie jar in the script now.

A third trap, for anything asserting on rendered HTML: React inserts
`<!-- -->` between adjacent text nodes, so `body.includes("NPR 449")` is a false
negative. Strip comments and tags first.
