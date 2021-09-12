export default function joinNaturalLanguage(items: any[]): string {
    return items.join(', ').replace(/, ([^,]*)$/, ' and $1');
}