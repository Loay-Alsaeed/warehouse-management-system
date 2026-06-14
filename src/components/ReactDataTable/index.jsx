import { formatDate, formatDateTime, customSortFunction } from "./dataTableUtils";
import DataTable from "react-data-table-component";
import { getDTCustomStyles } from "./style";
import { useTheme, Box } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import ChevronLeftTwoToneIcon from '@mui/icons-material/ChevronLeftTwoTone';
import ChevronRightTwoToneIcon from '@mui/icons-material/ChevronRightTwoTone';
import ExpandMoreTwoToneIcon from '@mui/icons-material/ExpandMoreTwoTone';

const ReactDataTable = ({ paginationRowsPerPageOptions, paginationPerPage, columns, data, SelectedRow, onRowClicked, onChangePage, disabled, expandableRowsHideExpander, expandableRows, expandableRowsComponent, pagination, stickyFirstColumn }) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const customStyles = getDTCustomStyles(theme, stickyFirstColumn);
    const [headerHeight, setHeaderHeight] = useState(0);
    const tableContainerRef = useRef(null);
    const conditionalRowStyles = [
        {
            when: (row) => row?.tableData?.id === SelectedRow?.tableData?.id,
            style: {
                color: "white",
                backgroundColor: "#364153",
                position: "sticky",
                top: `${headerHeight}px`,
                zIndex: 101,
            },
        },
    ];

    useEffect(() => {
        const updateHeaderHeight = () => {
            const header = tableContainerRef.current?.querySelector(".rdt_TableHead");

            if (header) {
                setHeaderHeight(header.offsetHeight);
            }
        };

        updateHeaderHeight();

        window.addEventListener("resize", updateHeaderHeight);

        return () => {
            window.removeEventListener("resize", updateHeaderHeight);
        };
    }, [data]);

    const ColumnOptions = {
        wrap: true,
        sortable: true,

    }

    const processedColumns = columns?.map((col, index) => {
        if (!stickyFirstColumn || index !== 0) {
            return col;
        }

        return {
            ...col,
            style: {
                position: "sticky",
                right: theme.direction === "rtl" ? 0 : undefined,
                left: theme.direction === "ltr" ? 0 : undefined,
                zIndex: 10,
                backgroundColor: "#1e2939",
                color: "white",
            },
        };
    });

    const formatedColumns = processedColumns?.map((item) => {
        if (item.type === "datetime") {
            return { ...ColumnOptions, ...item, format: (row) => formatDateTime(item.selector(row)) };
        } else if (item.type === "date") {
            return { ...ColumnOptions, ...item, format: (row) => formatDate(item.selector(row)) };
        }
        return {
            ...ColumnOptions,
            ...item,
            ...item.sortSelectors && {
                sortFunction: (rowA, rowB) => customSortFunction(rowA, rowB, item.sortSelectors)
            }
        };
    });

    const dataWithIdentifier = data.map((item, index) => ({ ...item, tableData: { id: index + 1 } }));

    useEffect(() => onRowClicked(null), [data])

    return (
        <Box
            ref={tableContainerRef}
            sx={{
            overflowX: "auto",
            overflowY: "auto",
            width: "100%",
            backgroundColor: "#364153",
            borderRadius: theme.shape.borderRadius / 2,
            color: "white",
        }}>
            <DataTable
                disabled={disabled}
                data={dataWithIdentifier}
                columns={formatedColumns}
                pagination={pagination}
                //paginationPerPage={paginationPerPage}
                paginationRowsPerPageOptions={paginationRowsPerPageOptions}
                onChangePage={onChangePage}
                noDataComponent={<Box sx={{ p: 2, color: "white", bgcolor: "#1e2939" }}>{t("strNoData")}</Box>}
                persistTableHead
                pointerOnHover
                customStyles={customStyles}
                onRowClicked={onRowClicked}
                conditionalRowStyles={conditionalRowStyles}
                expandableRowsHideExpander={expandableRowsHideExpander}
                expandableRows={expandableRows}
                expandableRowsComponent={expandableRowsComponent}
                paginationComponentOptions={{
                    rowsPerPageText: null
                }}
                expandableIcon={{
                    collapsed: theme.direction === "rtl" ? <ChevronLeftTwoToneIcon /> : <ChevronRightTwoToneIcon />,
                    expanded: <ExpandMoreTwoToneIcon />
                }}
                fixedHeader
                fixedHeaderScrollHeight="700px"
            />
        </Box>
    );
};

export default ReactDataTable;

ReactDataTable.defaultProps = {
    onRowClicked: () => { },
    onChangePage: () => { },   
    disabled: false,
    expandableRowsHideExpander: true,
    expandableRows: false,
    expandableRowsComponent: false,
    pagination: true,
    paginationRowsPerPageOptions: [5, 10, 25, 50],
    //   paginationPerPage:5
    stickyFirstColumn: false
}