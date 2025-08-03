"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, ArrowLeft, Filter } from "lucide-react";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { toast } from "sonner";
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender, ColumnDef, getFilteredRowModel } from "@tanstack/react-table";
import { mediaDB, VideoFileRecord } from '@/lib/mediaDB';

// File record type
interface UploadedFile {
  id: string;
  name: string;
  uploadedAt: string;
  description: string;
  size: number;
  type: string;
}

// Stable initial data to prevent hydration errors
const initialFiles: UploadedFile[] = [];

// Helper function to safely access localStorage
const getStoredFiles = (): UploadedFile[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('uploadedFiles');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper function to get file type from filename
const getFileType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
    return 'video';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
    return 'image';
  }
  if (['pdf'].includes(extension)) {
    return 'pdf';
  }
  if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) {
    return 'document';
  }
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return 'spreadsheet';
  }
  return 'other';
};

// Helper function to get file type badge color
const getFileTypeBadge = (type: string) => {
  const badgeProps = {
    video: { variant: "default" as const, className: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
    image: { variant: "secondary" as const, className: "bg-green-100 text-green-800 hover:bg-green-200" },
    pdf: { variant: "destructive" as const, className: "bg-red-100 text-red-800 hover:bg-red-200" },
    document: { variant: "outline" as const, className: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
    spreadsheet: { variant: "default" as const, className: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
    other: { variant: "secondary" as const, className: "bg-gray-100 text-gray-800 hover:bg-gray-200" }
  };
  
  return badgeProps[type as keyof typeof badgeProps] || badgeProps.other;
};

// Main Sources Page Component
export default function SourcesPage() {
  // State management
  const [files, setFiles] = useState<VideoFileRecord[]>([]);
  const [currentView, setCurrentView] = useState<'sources' | 'uploaded'>('sources');
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState({
    open: false,
    fileId: '',
    fileName: '',
    fileDescription: ''
  });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save files to localStorage whenever files change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('uploadedFiles', JSON.stringify(files));
    }
  }, [files]);

  // On mount, fetch files from DB
  useEffect(() => {
    mediaDB.videos.toArray().then(setFiles);
  }, []);

  // Memoized filtered files to prevent unnecessary recalculations
  const filteredFiles = useMemo(() => {
    let filtered = files;
    
    // Apply text filter
    if (globalFilter) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        (f.description || '').includes(globalFilter.toLowerCase())
      );
    }
    
    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(f => getFileType(f.name) === typeFilter);
    }
    
    return filtered;
  }, [files, globalFilter, typeFilter]);

  // Get unique file types for filter dropdown
  const fileTypes = useMemo(() => {
    const types = Array.from(new Set(files.map(f => getFileType(f.name))));
    return types.sort();
  }, [files]);

  // Replace all localStorage usage for uploaded files with mediaDB
  // On upload:
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const newFile: VideoFileRecord = {
        name: file.name,
        uploadedAt: new Date().toISOString(),
        size: file.size,
        type: getFileType(file.name),
        blob: file,
        description: ""
      };
      await mediaDB.videos.add(newFile);
      // Refresh files from DB
      const allFiles = await mediaDB.videos.toArray();
      setFiles(allFiles);
      toast.success(`File "${file.name}" uploaded successfully`);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file. Please try again.");
    }
  }, []);

  // On delete:
  const handleDelete = useCallback(async (ids: number[]) => {
    try {
      for (const id of ids) {
        await mediaDB.videos.delete(id);
      }
      const allFiles = await mediaDB.videos.toArray();
      setFiles(allFiles);
      toast.success(`${ids.length} file(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete file(s).");
    }
  }, []);

  // Handle edit dialog
  const handleEdit = useCallback((file: VideoFileRecord) => {
    setEditDialog({
      open: true,
      fileId: file.id?.toString() ?? '',
      fileName: file.name,
      fileDescription: file.description ?? ''
    });
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    setFiles(prevFiles => prevFiles.map(f => 
      f.id === Number(editDialog.fileId) 
        ? { ...f, name: editDialog.fileName, description: editDialog.fileDescription }
        : f
    ));
    setEditDialog({ open: false, fileId: '', fileName: '', fileDescription: '' });
    toast.success("File updated successfully");
  }, [editDialog]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const handleDragAreaClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Stable table columns definition
  const columns = useMemo<ColumnDef<VideoFileRecord, any>[]>(() => [
    {
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === filteredFiles.length && filteredFiles.length > 0}
          onChange={e => {
            setSelectedIds(
              e.target.checked
                ? new Set(filteredFiles.map(f => f.id ?? -1))
                : new Set()
            );
          }}
          aria-label="Select all files"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={typeof row.original.id === 'number' && selectedIds.has(row.original.id ?? -1)}
          onChange={e => {
            setSelectedIds(prev => {
              const next = new Set(prev);
              if (typeof row.original.id !== 'number') return next;
              if (e.target.checked) {
                next.add(row.original.id ?? -1);
              } else {
                next.delete(row.original.id ?? -1);
              }
              return next;
            });
          }}
          aria-label={`Select ${row.original.name}`}
        />
      ),
      size: 50,
    },
    {
      accessorKey: "name",
      header: "File Name",
      cell: ({ getValue }) => (
        <span className="font-medium" title={getValue() as string}>
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const fileType = getFileType(row.original.name);
        const badgeProps = getFileTypeBadge(fileType);
        return (
          <Badge {...badgeProps}>
            {fileType.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "uploadedAt",
      header: "Uploaded At",
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return (
          <span title={date.toLocaleString()}>
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm">
          {(row.original.description ?? '') || (
            <span className="text-muted-foreground italic">No description</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: "size",
      header: "Size",
      cell: ({ getValue }) => {
        const bytes = getValue() as number;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            className="text-muted-foreground hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50"
            title={`Edit ${row.original.name}`}
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            className="text-muted-foreground hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
            title={`Delete ${row.original.name}`}
            onClick={() => handleDelete([row.original.id ?? -1])}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [selectedIds, filteredFiles.length, handleDelete, handleEdit]);

  // Table instance with stable configuration
  const table = useReactTable({
    data: filteredFiles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
    enableRowSelection: true,
    manualPagination: false,
  });

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
    // Reset input value to allow same file to be selected again
    e.target.value = '';
  }, [handleFileUpload]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      handleDelete(Array.from(selectedIds));
    }
  }, [selectedIds, handleDelete]);

  // Render Sources View
  const renderSourcesView = () => (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Sources</h1>
        <p className="text-muted-foreground mt-2">
          Add and manage your video sources for monitoring and analysis. Choose between connecting to an RTSP stream or uploading a local video file.
        </p>
      </div>
      {/* Tabs Section */}
      <Tabs defaultValue="rtsp" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="rtsp">RTSP Stream</TabsTrigger>
          <TabsTrigger value="local">Local File</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rtsp">
          <Card>
            <CardHeader>
              <CardTitle>Connect to RTSP Stream</CardTitle>
              <CardDescription>
                Enter the URL of an RTSP stream to begin monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="rtsp-url">Stream URL</Label>
                <Input 
                  id="rtsp-url" 
                  placeholder="rtsp://your-stream-url" 
                  type="url"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Connect</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="local">
          <Card>
            <CardHeader>
              <CardTitle>Upload Local Video File</CardTitle>
              <CardDescription>
                Upload a video file from your computer to analyze.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="video/*,image/*,application/pdf"
                onChange={handleFileInputChange}
                aria-label="File upload input"
              />
              
              {/* OR separator */}
              <div className="flex items-center justify-center space-x-3 my-4">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground font-semibold select-none">OR</span>
                <Separator className="flex-1" />
              </div>
              
              {/* Drag-and-drop area */}
              <div
                className={`flex h-32 w-full items-center justify-center rounded-md border-2 border-dashed transition-all duration-200 cursor-pointer relative ${
                  dragActive 
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
                    : "border-muted-foreground/40 bg-muted/30 hover:border-muted-foreground/60 hover:bg-muted/40"
                }`}
                onClick={handleDragAreaClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                tabIndex={0}
                role="button"
                aria-label="Upload file by clicking or dragging"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDragAreaClick();
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                  <Plus className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    {dragActive ? "Drop file here" : "Drag and drop a file here or click to select"}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button onClick={handleDragAreaClick} className="w-full">
                Upload and Process
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Navigation to uploaded files */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setCurrentView('uploaded')}
          className="text-sm"
        >
          View Uploaded Media ({files.length})
        </Button>
      </div>
    </div>
  );

  // Render Uploaded Files View
  const renderUploadedView = () => (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Uploaded Media</h1>
        <p className="text-muted-foreground mt-2">
          Manage and organize your uploaded files with search, filtering, and editing capabilities.
        </p>
      </div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Input
            placeholder="Search files..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full sm:w-80"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {fileTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            Delete Selected ({selectedIds.size})
          </Button>
        )}
      </div>
      
      {/* Table */}
      <div className="rounded-md border w-full">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder 
                      ? null 
                      : flexRender(header.column.columnDef.header, header.getContext())
                    }
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow 
                  key={(row.id ?? -1).toString()} 
                  data-state={selectedIds.has(row.original.id ?? -1) ? "selected" : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  {globalFilter || typeFilter !== "all" ? "No files match your search criteria." : "No files uploaded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Back to Sources Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setCurrentView('sources')}
          className="text-sm"
        >
          Back to Sources
        </Button>
      </div>
      
      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredFiles.length)} of{' '}
            {filteredFiles.length} files
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => table.previousPage()}
                  className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: table.getPageCount() }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    onClick={() => table.setPageIndex(i)}
                    isActive={table.getState().pagination.pageIndex === i}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => table.nextPage()}
                  className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );

  return (
    <>
      {currentView === 'sources' ? renderSourcesView() : renderUploadedView()}
      
      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit File Details</DialogTitle>
            <DialogDescription>
              Make changes to the file name and description here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">File Name</Label>
              <Input
                id="edit-name"
                value={editDialog.fileName}
                onChange={(e) => setEditDialog(prev => ({ ...prev, fileName: e.target.value }))}
                placeholder="Enter file name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDialog.fileDescription}
                onChange={(e) => setEditDialog(prev => ({ ...prev, fileDescription: e.target.value }))}
                placeholder="Enter file description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, fileId: '', fileName: '', fileDescription: '' })}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}