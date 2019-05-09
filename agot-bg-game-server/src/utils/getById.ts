export default function getById<E extends {id: K}, K>(list: E[], id: K): E {
    const elements = list.filter(e => e.id == id);

    if (elements.length == 0) {
        throw new Error("No elements with id \"" + id + "\" found in list");
    } else if (elements.length > 1) {
        throw new Error(elements.length + " element found with id \"" + id + "\" found in list");
    }

    return elements[0];
}
