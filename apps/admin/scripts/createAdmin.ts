import { nanoid } from 'nanoid';

import { auth } from '../server/utils/auth';

const ctx = await auth.$context;
const internalAdapter = ctx.internalAdapter;
const password = ctx.password;

const initialPassword = nanoid(12);

const user = await internalAdapter.createUser(
  {
    email: 'admin@jiansheng.art',
    emailVerified: true,
    name: 'Admin',
    username: 'admin',
    role: 'admin',
  },
  { method: 'admin' },
);

await internalAdapter.linkAccount({
  accountId: user.id,
  providerId: 'credential',
  userId: user.id,
  password: await password.hash(initialPassword),
});

console.log('User.created', { username: user.name, email: user.email, password: initialPassword });
