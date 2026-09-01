import type { MonitorSpec } from "@/lib/monitors-data";

interface MonitorSpecsTableProps {
  specs: MonitorSpec[];
}

const MonitorSpecsTable = ({ specs }: MonitorSpecsTableProps) => {
  return (
    <div className="bg-card rounded-lg border overflow-hidden mb-6">
      <table className="w-full text-sm">
        <tbody>
          {specs.map((spec, index) => (
            <tr key={spec.label} className={index % 2 === 0 ? "bg-muted/30" : ""}>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground w-2/5 align-top">
                {spec.label}
              </th>
              <td className="py-3 px-4 align-top">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MonitorSpecsTable;
