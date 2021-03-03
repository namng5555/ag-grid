import {
    Column,
    ColumnWidthCallbackParams,
    Constants,
    ExcelCell,
    ExcelColumn,
    ExcelRow,
    ExcelStyle,
    ExcelWorksheet,
    RowNode,
    _
} from "@ag-grid-community/core";

import {
    BaseGridSerializingSession,
    GridSerializingParams,
    RowAccumulator,
    RowSpanningAccumulator,
    RowType
} from "@ag-grid-community/csv-export";

export interface ExcelGridSerializingParams extends GridSerializingParams {
    sheetName: string;
    baseExcelStyles: ExcelStyle[];
    styleLinker: (rowType: RowType, rowIndex: number, colIndex: number, value: string, column?: Column, node?: RowNode) => string[];
    suppressTextAsCDATA?: boolean;
    rowHeight?: number;
    headerRowHeight?: number;
    columnWidth?: number | ((params: ColumnWidthCallbackParams) => number);
    autoConvertFormulas?: boolean;
}

interface ExcelMixedStyle {
    key: string;
    excelID: string;
    result: ExcelStyle;
}

export abstract class BaseExcelSerializingSession<T> extends BaseGridSerializingSession<ExcelCell[][]> {
    protected readonly config: ExcelGridSerializingParams;
    protected readonly stylesByIds: { [key: string]: ExcelStyle };

    protected mixedStyles: { [key: string]: ExcelMixedStyle } = {};
    protected mixedStyleCounter: number = 0;

    protected readonly excelStyles: ExcelStyle[];

    protected rows: ExcelRow[] = [];
    protected cols: ExcelColumn[];


    constructor(config: ExcelGridSerializingParams) {
        super(config);
        this.config = _.assign({}, config);
        this.stylesByIds = {};
        this.config.baseExcelStyles.forEach(style => {
            this.stylesByIds[style.id] = style;
        });
        this.excelStyles = [...this.config.baseExcelStyles];
    }

    public abstract onNewHeaderGroupingRow(): RowSpanningAccumulator;
    protected abstract createExcel(data: ExcelWorksheet): string;
    protected abstract getDataTypeForValue(valueForCell: string): T;
    protected abstract onNewHeaderColumn(rowIndex: number, currentCells: ExcelCell[]): (column: Column, index: number, node: RowNode) => void;
    protected abstract getType(type: T, style: ExcelStyle | null, value: string | null): T | null;
    protected abstract createCell(styleId: string | null, type: T, value: string): ExcelCell;
    protected abstract createMergedCell(styleId: string | null, type: T, value: string, numOfCells: number): ExcelCell;

    public addCustomContent(customContent: ExcelCell[][]): void {
        customContent.forEach(cells => this.rows.push({cells}));
    }

    public prepare(columnsToExport: Column[]): void {
        super.prepare(columnsToExport);
        this.cols = columnsToExport.map((col, i) => this.convertColumnToExcel(col, i));
    }

    public parse(): string {
        // adding custom content might have made some rows wider than the grid, so add new columns
        const longestRow = this.rows.reduce((a, b) => Math.max(a, b.cells.length), 0);
        while (this.cols.length < longestRow) {
            this.cols.push(this.convertColumnToExcel(null, this.cols.length + 1));
        }

        const data: ExcelWorksheet = {
            name: this.config.sheetName,
            table: {
                columns: this.cols,
                rows: this.rows
            }
        };

        return this.createExcel(data);
    }

    public onNewHeaderRow(): RowAccumulator {
        return this.onNewRow(this.onNewHeaderColumn, this.config.headerRowHeight);
    }

    public onNewBodyRow(): RowAccumulator {
        return this.onNewRow(this.onNewBodyColumn, this.config.rowHeight);
    }

    protected isFormula(value: string | null) {
        if (value == null) { return false; }
        return this.config.autoConvertFormulas && value.startsWith('=');
    }

    protected getStyleById(styleId?: string | null): ExcelStyle | null {
        if (styleId == null) { return null; }
        return this.stylesByIds[styleId] || null;
    }

    private convertColumnToExcel(column: Column | null, index: number): ExcelColumn {
        const columnWidth = this.config.columnWidth;
        if (columnWidth) {
            if (typeof columnWidth === 'number') {
                return { width: columnWidth };
            }
            return { width: columnWidth({column, index}) };
        }

        if (column) {
            const smallestUsefulWidth = 75;
            return { width: Math.max(column.getActualWidth(), smallestUsefulWidth) };
        }
        return {};
    }

    private onNewRow(onNewColumnAccumulator: (rowIndex: number, currentCells: ExcelCell[]) => (column: Column, index: number, node: RowNode) => void, height?: number): RowAccumulator {
        const currentCells: ExcelCell[] = [];
        this.rows.push({
            cells: currentCells,
            height
        });
        return {
            onColumn: onNewColumnAccumulator.bind(this, this.rows.length, currentCells)()
        };
    }

    private onNewBodyColumn(rowIndex: number, currentCells: ExcelCell[]): (column: Column, index: number, node: RowNode) => void {
        return (column, index, node) => {
            const valueForCell = this.extractRowCellValue(column, index, Constants.EXPORT_TYPE_EXCEL, node);
            const styleIds: string[] = this.config.styleLinker(RowType.BODY, rowIndex, index, valueForCell, column, node);
            let excelStyleId: string | undefined;
            if (styleIds && styleIds.length == 1) {
                excelStyleId = styleIds [0];
            } else if (styleIds && styleIds.length > 1) {
                const key: string = styleIds.join("-");
                if (!this.mixedStyles[key]) {
                    this.addNewMixedStyle(styleIds);
                }
                excelStyleId = this.mixedStyles[key].excelID;
            }
            currentCells.push(this.createCell(excelStyleId || null, this.getDataTypeForValue(valueForCell), valueForCell));
        };
    }

    private addNewMixedStyle(styleIds: string[]): void {
        this.mixedStyleCounter += 1;
        const excelId = 'mixedStyle' + this.mixedStyleCounter;
        const resultantStyle: ExcelStyle = {} as ExcelStyle;

        styleIds.forEach((styleId: string) => {
            this.excelStyles.forEach((excelStyle: ExcelStyle) => {
                if (excelStyle.id === styleId) {
                    _.mergeDeep(resultantStyle, _.deepCloneObject(excelStyle));
                }
            });
        });

        resultantStyle.id = excelId;
        resultantStyle.name = excelId;
        const key: string = styleIds.join("-");
        this.mixedStyles[key] = {
            excelID: excelId,
            key: key,
            result: resultantStyle
        };
        this.excelStyles.push(resultantStyle);
        this.stylesByIds[excelId] = resultantStyle;
    }
}