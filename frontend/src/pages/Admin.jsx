import { useState } from "react";
import { Tabs } from "../components/ui";
import MenuEditor from "./admin/MenuEditor";
import Overview from "./admin/Overview";
import Staff from "./admin/Staff";

const SECTIONS = { overview: Overview, menu: MenuEditor, staff: Staff };

export default function Admin() {
  const [tab, setTab] = useState("overview");
  const Section = SECTIONS[tab];

  return (
    <section className="container page">
      <div className="page-head">
        <h1>Admin</h1>
        <Tabs value={tab} onChange={setTab} options={[["overview", "Overview"], ["menu", "Menu"], ["staff", "Team"]]} />
      </div>
      <Section />
    </section>
  );
}
