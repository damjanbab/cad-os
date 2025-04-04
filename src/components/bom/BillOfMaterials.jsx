import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BillOfMaterials = ({ data = [], modelName = 'Model' }) => {
  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'dimensions',
        header: 'Dimensions',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'material',
        header: 'Material',
        cell: info => info.getValue(),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Bill of Materials - ${modelName}`, 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [columns.map(col => col.header)],
      body: data.map(row => columns.map(col => row[col.accessorKey])),
    });
    doc.save(`${modelName}_BoM.pdf`);
  };

  if (!data || data.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No Bill of Materials data available for this model.</div>;
  }

  return (
    <div style={{ padding: '15px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4em' }}>Bill of Materials</h2>
        <button
          onClick={exportPDF}
          style={{
            padding: '8px 15px',
            fontSize: '1em',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Export PDF
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BillOfMaterials;
