/*
 * Migration: Backfill auth flags on User documents
 * - passwordSetup: boolean (true if user has explicitly set a password)
 * - authMethods: ['password','google']
 * - primaryAuthMethod: 'password' | 'google'
 *
 * Heuristics:
 * - If passwordSetup is undefined, infer from passwordHash containing 'google_user_' (legacy google-first accounts)
 * - If googleLinked true, include 'google' in authMethods
 * - If passwordSetup true, include 'password' in authMethods
 * - If primaryAuthMethod missing, prefer 'google' when googleLinked && !passwordSetup, else 'password'
 */

const mongoose = require('mongoose');
const User = require('../Models/User');

async function run() {
  const mongoUri =
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campverse';
  await mongoose.connect(mongoUri);
  process.stdout.write('Connected to MongoDB\n');

  const cursor = User.find({}).cursor();
  let examined = 0;
  let updated = 0;

  for (
    let user = await cursor.next();
    user != null;
    user = await cursor.next()
  ) {
    examined += 1;
    const changes = {};

    // passwordSetup inference
    if (typeof user.passwordSetup !== 'boolean') {
      const isGoogleGenerated =
        typeof user.passwordHash === 'string' &&
        user.passwordHash.includes('google_user_');
      changes.passwordSetup = !isGoogleGenerated;
    }

    // authMethods
    const methods = new Set(
      Array.isArray(user.authMethods) ? user.authMethods : [],
    );
    const effectivePasswordSetup =
      typeof changes.passwordSetup === 'boolean'
        ? changes.passwordSetup
        : !!user.passwordSetup;
    if (effectivePasswordSetup) methods.add('password');
    if (user.googleLinked) methods.add('google');
    const authMethods = Array.from(methods);
    if (
      authMethods.length !== (user.authMethods ? user.authMethods.length : 0) ||
      (user.authMethods || []).some((m) => !methods.has(m))
    ) {
      changes.authMethods = authMethods;
    }

    // primaryAuthMethod
    if (!user.primaryAuthMethod) {
      changes.primaryAuthMethod =
        user.googleLinked && !effectivePasswordSetup ? 'google' : 'password';
    }

    if (Object.keys(changes).length > 0) {
      await User.updateOne({ _id: user._id }, { $set: changes });
      updated += 1;
    }
  }

  process.stdout.write(`Examined: ${examined}, Updated: ${updated}\n`);
  await mongoose.disconnect();
  process.stdout.write('Done\n');
}

run().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});
