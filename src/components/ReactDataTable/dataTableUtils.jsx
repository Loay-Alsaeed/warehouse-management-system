import moment from "moment";

export const formatDateTime = (item) => {
    const isValid = moment(item).isValid();
    return Boolean(item) && isValid ? moment(item).format("YYYY-MM-DD HH:mm:ss") : "";
};

export const formatDate = (item) => {
    if (!item) return "";
    const isValid = moment(item).isValid();
    return Boolean(item) && isValid ? moment(item).format("YYYY-MM-DD") : "";
};


const compare = (a, b) => {
    //handles string values or numeric values
    if (a > b) {
        return 1;
    }
    if (b > a) {
        return -1;
    }
    return 0;
}

export const customSortFunction = (rowA, rowB, selectors) => {
    //selectors order matter
    return selectors.reduce((a, selector) => {
        return compare(selector(rowA), selector(rowB)) || a
    }, 0)

}