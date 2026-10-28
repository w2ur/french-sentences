# Tests

Back to the [README](../README.md).

```sh
npm test    # builds, then runs the suite under node --test
```

The runner is `node --test`, with no test-framework dependency beyond
`fast-check` for the property tests. `detectSentences` is a pure function from
a string to offsets, so there is nothing to stub and no I/O to mock.

The **property tests** live in
[`test/sentences.property.test.ts`](../test/sentences.property.test.ts): for
arbitrary generated input, the ranges must partition the input exactly, be
contiguous and ordered, match their own offsets, and be deterministic. Those
hold for every input rather than the dozen someone thought to write down.

The rest, in [`test/sentences.test.ts`](../test/sentences.test.ts), pin French
behaviour by example, and each regression test carries the bug it prevents.
Every one of them was checked against the previous implementation to confirm it
actually fails there — a test that has never failed proves nothing.

`npm test` prints the current number of tests; this page does not repeat it.
