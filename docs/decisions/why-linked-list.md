# Decision Record: Why a Doubly Linked List for Price Levels

## Context
A limit order book must support fast order insertions (at the tail of a price level queue), order cancellations from anywhere in the book, order updates on partial fills, and sequential FIFO execution for price-time priority.

## Alternatives Considered
1. **Dynamic Arrays (`Array.prototype.splice`)**:
   - Appending to the tail is amortized $O(1)$.
   - Deleting an order from the front (`shift()`) or middle (`splice(i, 1)`) requires shifting all subsequent elements in memory, costing $O(N)$ where $N$ is the queue length at that price level.
2. **Singly Linked List**:
   - Appending to tail and removing from head is $O(1)$.
   - However, cancelling an arbitrary order from the middle requires traversing the list from head to find the predecessor node, degrading cancellation to $O(N)$.
3. **Doubly Linked List + Hash Map (`Level` + `Book.ordersById`)**:
   - Each order node maintains direct pointers to `prev` and `next`, plus a pointer to its enclosing `Level`.
   - The book maintains an `ordersById` hash map indexing every live order.

## Decision
We use a **Doubly Linked List** for each price level queue in combination with the `ordersById` map.

## Consequences & Performance
- **$O(1)$ Cancellation**: When a user or system cancels an order by ID, the map looks up the node in $O(1)$. The node unlinks itself by reassigning `prev.next = next` and `next.prev = prev` in $O(1)$ without scanning the queue.
- **$O(1)$ FIFO Matching**: Takers match against `head` in $O(1)$. A filled maker is unlinked in $O(1)$.
- **Zero Memory Shift**: No array elements are shifted in memory during queue mutation.
