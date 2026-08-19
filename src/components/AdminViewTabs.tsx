"use client";

export type AdminViewTab = "edit" | "preview";

export function AdminViewTabs({
  active,
  onChange,
  label = "Editor view",
}: {
  active: AdminViewTab;
  onChange: (tab: AdminViewTab) => void;
  label?: string;
}) {
  return (
    <div className="admin-view-tabs" role="tablist" aria-label={label}>
      <button
        type="button"
        role="tab"
        id="admin-tab-edit"
        aria-selected={active === "edit"}
        aria-controls="admin-panel-edit"
        className={active === "edit" ? "is-active" : undefined}
        onClick={() => onChange("edit")}
      >
        Edit
      </button>
      <button
        type="button"
        role="tab"
        id="admin-tab-preview"
        aria-selected={active === "preview"}
        aria-controls="admin-panel-preview"
        className={active === "preview" ? "is-active" : undefined}
        onClick={() => onChange("preview")}
      >
        Preview
      </button>
    </div>
  );
}

export function AdminTabPanel({
  tab,
  active,
  children,
}: {
  tab: AdminViewTab;
  active: AdminViewTab;
  children: React.ReactNode;
}) {
  if (active !== tab) return null;
  return (
    <div
      role="tabpanel"
      id={tab === "edit" ? "admin-panel-edit" : "admin-panel-preview"}
      aria-labelledby={tab === "edit" ? "admin-tab-edit" : "admin-tab-preview"}
      className="admin-tab-panel"
    >
      {children}
    </div>
  );
}
