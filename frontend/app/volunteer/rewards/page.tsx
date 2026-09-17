"use client";

import { useState } from "react";
import { AdminTabs } from "@/components/admin";
import { BadgeShowcase } from "@/components/volunteer/BadgeShowcase";
import { CertificatesGallery } from "@/components/volunteer/CertificatesGallery";

export default function VolunteerRewardsPage() {
  const [tab, setTab] = useState("badges");

  return (
    <section>
      <div className="mb-6">
        <AdminTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "badges", label: "Mes Badges" },
            { id: "certificates", label: "Mes Certificats" },
          ]}
        />
      </div>
      {tab === "badges" ? <BadgeShowcase /> : <CertificatesGallery />}
    </section>
  );
}
