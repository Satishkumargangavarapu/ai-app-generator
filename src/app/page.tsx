import { getUser } from '@/lib/auth';
import { HomePageClient } from '@/components/HomePageClient';

export default async function Home() {
  const user = await getUser();

  return <HomePageClient initialUser={user} />;
}
