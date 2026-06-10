import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

export default function DeviceTable({ devices, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Asset Tag</TableHead>
            <TableHead className="font-semibold">Device Name</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Brand</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Model</TableHead>
            <TableHead className="font-semibold hidden lg:table-cell">Serial Number</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id} className="group">
              <TableCell className="font-mono text-sm font-medium">{device.asset_tag}</TableCell>
              <TableCell className="font-medium">{device.device_name}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{device.brand}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{device.model}</TableCell>
              <TableCell className="hidden lg:table-cell font-mono text-sm text-muted-foreground">{device.serial_number}</TableCell>
              <TableCell><StatusBadge status={device.status} /></TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(device)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(device)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
