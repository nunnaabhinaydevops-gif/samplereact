export default function ModulePlaceholder({ module }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900">{module.label}</h2>
      <p className="mt-2 text-sm text-slate-500">
        This module is part of a later build stage and is not connected to data yet.
      </p>
    </section>
  )
}
