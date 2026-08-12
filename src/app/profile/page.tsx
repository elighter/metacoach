import { getCurrentUser, prisma } from "@/lib/db";
import { ProfileForm } from "@/components/profile-form";
import { FileText, Scale, Utensils } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const [labs, bios, meals] = await Promise.all([
    prisma.labResult.count({ where: { userId: user.id } }),
    prisma.biometric.count({ where: { userId: user.id } }),
    prisma.meal.count({ where: { userId: user.id } }),
  ]);

  const initial = {
    name: user.name,
    email: user.email,
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : "",
    sex: user.sex ?? "male",
    heightCm: (user.heightCm ?? "") as number | "",
    activityBase: user.activityBase,
    goal: user.goal,
    unitPref: user.unitPref,
    locale: user.locale,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
      <p className="mt-1 text-sm text-ink-3">Kişisel bilgilerin burada saklanır ve metabolizma hesabında kullanılır.</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={FileText} label="Kan tahlili" value={labs} />
        <Stat icon={Scale} label="Ölçüm" value={bios} />
        <Stat icon={Utensils} label="Öğün kaydı" value={meals} />
      </div>

      <div className="mt-5">
        <ProfileForm initial={initial} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-wash text-primary-ink">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
        <div className="text-xs text-ink-3">{label}</div>
      </div>
    </div>
  );
}
