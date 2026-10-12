# Local database

Prisma 7.10.0 with the PostgreSQL driver adapter and PostgreSQL 18.6. The six-table foundation follows the approved Phase 2 proposal. Migrations add composite workspace foreign keys, revision pointers, provenance constraints, salary bounds, source policy checks, and profile-evidence validation.

```sh
npm ci
npm run db:setup
npm run dev
```

Setup creates ignored `.env.local` credentials with a random password, starts the dedicated `orbit-postgres-1` Compose service on **127.0.0.1:55432**, deploys migrations, and creates only an empty local workspace. Restart the app after setup. No personal facts or jobs are seeded. A named volume preserves data; stop with `docker compose --env-file .env.local stop`. Do not delete the volume to stop the service.

`db:setup` refuses to manage a different URL, port, database name, or credential combination. It does not touch other PostgreSQL instances. For an explicitly configured existing local database, put its credentialed loopback URL in ignored `.env.local`, run `npm run db:migrate`, and initialize the local workspace deliberately. Do not migrate an unidentified database. No remote database URLs are accepted in local mode. Never print `.env.local`, enable Prisma DEBUG logs with credentials loaded, or commit secrets.

```sh
npm run db:validate
npm run db:generate
npm run test:db
```

Integration tests create a uniquely named disposable PostgreSQL container on a randomly assigned loopback port, deploy all migrations, run only the database tests, and remove their own container. They require the dedicated `orbit_test` database marker and never target the normal app database. Test fixtures are confined to that disposable database. An interrupted runner may leave an `orbit-test-*` container labeled `orbit.disposable-test=true`; inspect before removing it.

Settings reports Connected only after a real query and a local workspace lookup succeed. Missing URL, pending setup, and unavailable database are distinct. Workflow-dependent metrics remain unavailable until their workflows and queries are implemented.

Private documents will be stored under ignored `private/resumes`, outside /public; the database stores opaque file keys, never public URLs. UTC instants use timestamptz; daily boundaries use Asia/Kolkata.

Prisma generation occurs during postinstall, typecheck, and build. `src/generated/prisma` is ignored. Scoped npm overrides patch deepmerge-ts to 8.0.2 and mysql2 to 3.24.5 in Prisma tooling; CLI generation, validation, migration deployment, and real database tests were verified with these versions. The remaining lint dependency advisory is documented in README.md.

References: [Prisma 7 generator](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/generating-prisma-client), [Prisma 7 driver pooling](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool), [official PostgreSQL container](https://hub.docker.com/_/postgres).
