exports.chop = data => {
    return data.split(/,|，/)
        .map(v => v.replace(/[^A-Za-z]/g, ''))
        .filter(_ => _)
        .reduce((acc, cur) => {
            if (acc.indexOf(cur.toLowerCase()) === -1) {
                acc.push(cur.toLowerCase())
            }
            return acc
        }, [])
}