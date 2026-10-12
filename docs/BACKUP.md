# Private local backup and restore

JSON/CSV export in Settings is a readable snapshot; it excludes original resume bytes and is not a restorable database dump. For a complete backup, stop Orbit and any discovery/scheduling process, back up PostgreSQL with pg_dump and copy the private resume directory at the same time. Preserve `.env.local` separately in a private password manager or encrypted backup; never commit or print its credentials. These commands do not expose passwords.

## Backup the dedicated local Compose database

Run from the repository. Use a fresh backup directory outside the repository on private/encrypted storage. Replace the example path before running; the shell variable is deliberately not a system variable.

```sh
ORBIT_BACKUP_DIR=/absolute/private/location/orbit-backup-2026-10-12
umask 077
mkdir -p "$ORBIT_BACKUP_DIR"
docker compose --env-file .env.local exec -T postgres pg_dump -U orbit -d orbit --format=custom > "$ORBIT_BACKUP_DIR/orbit.dump"
cp -a private/resumes "$ORBIT_BACKUP_DIR/resumes"
chmod -R go-rwx "$ORBIT_BACKUP_DIR"
```

Check the pg_dump exit status; a partial file is not a successful backup. List the dump without restoring it:

```sh
docker compose --env-file .env.local exec -T postgres pg_restore --list < "$ORBIT_BACKUP_DIR/orbit.dump"
```

A missing `private/resumes` directory is acceptable only when no resume bytes have ever been uploaded. Save the matching source-code commit/package lock and migration files with the backup so the database can be read by the same version. Keep backups out of Git and public web directories. Database dumps and resume copies contain private data.

## Restore into a fresh isolated database first

Do not restore over the live Orbit database. Create an empty PostgreSQL 18 database/container owned by the local `orbit` role and bound to loopback, with a distinct name and port. Validate a restore there before deciding to replace your normal workspace. PostgreSQL client/server major versions should match the installed 18.x setup.

For a separately created local container named `orbit-restore-check` and empty database named `orbit_restore`, use:

```sh
docker exec -i orbit-restore-check pg_restore -U orbit -d orbit_restore --no-owner --exit-on-error < "$ORBIT_BACKUP_DIR/orbit.dump"
```

`--exit-on-error` prevents ignoring restore failures. Do not use `--clean` against a database containing data. Check restored row counts, migration history and private resume filenames against the backup without printing personal records. Run the same app version against the isolated loopback database using a privately configured environment; copy the backed-up resume directory into that test checkout's `private/resumes` before downloading a known resume. Keep the checkout local and preserve 0700 directory/0600 file permissions. JSON/CSV files are not input to pg_restore.

Switching the live database is a separate deliberate operation: retain the original database and private files, stop the app, supply the restored instance's credentials privately, restore matching resume files and restart the app. `npm run db:setup` manages only the dedicated Compose database on 127.0.0.1:55432/orbit, so do not use it to point at a restore-check database. Do not apply newer migrations until the matching version is verified. This phase documents restore; no user database was restored or replaced.
