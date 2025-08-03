"use client";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

const alerts = [
  {
    time: "2024-07-19 10:45:12",
    severity: "High",
    type: "Intrusion",
    description: "Person detected in restricted Zone A.",
  },
  {
    time: "2024-07-19 10:42:55",
    severity: "Medium",
    type: "Vehicle",
    description: "Vehicle entered restricted area near Gate 3.",
  },
  {
    time: "2024-07-19 10:30:02",
    severity: "Low",
    type: "Motion",
    description: "Unusual motion detected near warehouse D.",
  },
  {
    time: "2024-07-18 22:15:30",
    severity: "High",
    type: "Intrusion",
    description: "Multiple persons detected after hours in main office.",
  },
  {
    time: "2024-07-18 18:05:00",
    severity: "Low",
    type: "Motion",
    description: "Motion detected near perimeter fence.",
  },
];

const getSeverityVariant = (severity: string) => {
  switch (severity.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "default";
  }
};

export default function AlertsPage() {
  // Table controls
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    if (search) {
      filtered = filtered.filter(
        (a) =>
          a.description.toLowerCase().includes(search.toLowerCase()) ||
          a.type.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (severityFilter !== "all") {
      filtered = filtered.filter(
        (a) => a.severity.toLowerCase() === severityFilter.toLowerCase()
      );
    }
    return filtered;
  }, [search, severityFilter]);

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Alerts</h1>
        <p className="text-muted-foreground mt-2">
          Review all detected events and alerts in your surveillance system.
        </p>
      </div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Input
          placeholder="Search alerts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Table */}
      <div className="rounded-md border w-full">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAlerts.length ? (
              filteredAlerts.map((alert) => (
                <TableRow key={alert.time}>
                  <TableCell>{alert.time}</TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(alert.severity)}>{alert.severity}</Badge>
                  </TableCell>
                  <TableCell>{alert.type}</TableCell>
                  <TableCell>{alert.description}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No alerts match your search/filter criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 