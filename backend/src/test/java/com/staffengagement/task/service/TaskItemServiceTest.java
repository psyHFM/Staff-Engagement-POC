package com.staffengagement.task.service;

import com.staffengagement.shared.api.TaskItemSummary;
import com.staffengagement.shared.api.TaskSummaryWithItems;
import com.staffengagement.shared.kernel.TaskId;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.domain.TaskItem;
import com.staffengagement.task.repository.TaskItemRepository;
import com.staffengagement.task.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

/**
 * BDD unit tests for the ATSE1-34 task sub-items feature
 * (openSpec §8 / {@link TaskService#addItem},
 * {@link TaskService#updateItem}, {@link TaskService#deleteItem},
 * {@link TaskService#reorderItems},
 * {@link TaskService#taskWithItems}).
 *
 * <p>Mockito-only — no Spring context (integration testing is
 * disabled per the constitution).
 */
@ExtendWith(MockitoExtension.class)
class TaskItemServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private TaskItemRepository taskItemRepository;

    @InjectMocks private TaskService taskService;

    private static final Long TASK_ID = 100L;
    private Task existingTask;

    @BeforeEach
    void setUp() {
        existingTask = Task.builder()
                .id(TASK_ID)
                .subjectId(1L)
                .title("Parent")
                .description("Parent body")
                .completed(false)
                .build();
    }

    // --- addItem ------------------------------------------------------------

    @Test
    @DisplayName("addItem() appends with ordinal 0 to an empty checklist")
    void addItem_emptyChecklistStartsAtOrdinalZero() {
        // Given
        given(taskRepository.findById(TASK_ID)).willReturn(Optional.of(existingTask));
        given(taskItemRepository.findByTaskIdOrderByOrdinalAsc(TASK_ID))
                .willReturn(Collections.emptyList());
        given(taskItemRepository.save(any(TaskItem.class)))
                .willAnswer(inv -> {
                    TaskItem t = inv.getArgument(0);
                    t.setId(1L);
                    return t;
                });

        // When
        TaskItemSummary result = taskService.addItem(TASK_ID, "First");

        // Then
        assertThat(result.title()).isEqualTo("First");
        assertThat(result.ordinal()).isEqualTo(0);
        assertThat(result.completed()).isFalse();
        ArgumentCaptor<TaskItem> captor = ArgumentCaptor.forClass(TaskItem.class);
        then(taskItemRepository).should().save(captor.capture());
        assertThat(captor.getValue().getOrdinal()).isEqualTo(0);
    }

    @Test
    @DisplayName("addItem() assigns the next ordinal (max+1) when the checklist has items")
    void addItem_appendsAfterExistingItems() {
        // Given
        given(taskRepository.findById(TASK_ID)).willReturn(Optional.of(existingTask));
        TaskItem existing = TaskItem.builder()
                .id(1L).taskId(TASK_ID).ordinal(0).title("First").completed(false)
                .build();
        TaskItem second = TaskItem.builder()
                .id(2L).taskId(TASK_ID).ordinal(1).title("Second").completed(false)
                .build();
        given(taskItemRepository.findByTaskIdOrderByOrdinalAsc(TASK_ID))
                .willReturn(List.of(existing, second));
        given(taskItemRepository.save(any(TaskItem.class)))
                .willAnswer(inv -> {
                    TaskItem t = inv.getArgument(0);
                    t.setId(3L);
                    return t;
                });

        // When
        TaskItemSummary result = taskService.addItem(TASK_ID, "Third");

        // Then
        assertThat(result.ordinal()).isEqualTo(2);
    }

    @Test
    @DisplayName("addItem() rejects an unknown task id")
    void addItem_rejectsUnknownTask() {
        // Given
        given(taskRepository.findById(404L)).willReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> taskService.addItem(404L, "x"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Task not found: 404");
        then(taskItemRepository).should(never()).save(any());
    }

    // --- updateItem ---------------------------------------------------------

    @Test
    @DisplayName("updateItem() patches both title and completed when provided")
    void updateItem_patchesBothFields() {
        // Given
        TaskItem item = TaskItem.builder()
                .id(7L).taskId(TASK_ID).ordinal(0).title("Old").completed(false)
                .build();
        given(taskItemRepository.findById(7L)).willReturn(Optional.of(item));
        given(taskItemRepository.save(item)).willReturn(item);

        // When
        TaskItemSummary result = taskService.updateItem(TASK_ID, 7L, "New", true);

        // Then
        assertThat(item.getTitle()).isEqualTo("New");
        assertThat(item.isCompleted()).isTrue();
        assertThat(result.title()).isEqualTo("New");
        assertThat(result.completed()).isTrue();
    }

    @Test
    @DisplayName("updateItem() leaves the title untouched when only completed is provided")
    void updateItem_preservesUntouchedFields() {
        // Given
        TaskItem item = TaskItem.builder()
                .id(8L).taskId(TASK_ID).ordinal(0).title("Untouched").completed(false)
                .build();
        given(taskItemRepository.findById(8L)).willReturn(Optional.of(item));
        given(taskItemRepository.save(item)).willReturn(item);

        // When
        taskService.updateItem(TASK_ID, 8L, null, true);

        // Then — title is preserved
        assertThat(item.getTitle()).isEqualTo("Untouched");
        assertThat(item.isCompleted()).isTrue();
    }

    @Test
    @DisplayName("updateItem() rejects an item that belongs to a different task")
    void updateItem_rejectsCrossTaskItem() {
        // Given
        TaskItem item = TaskItem.builder()
                .id(9L).taskId(999L).ordinal(0).title("Foreign").completed(false)
                .build();
        given(taskItemRepository.findById(9L)).willReturn(Optional.of(item));

        // When / Then
        assertThatThrownBy(() -> taskService.updateItem(TASK_ID, 9L, "x", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong to task");
        then(taskItemRepository).should(never()).save(any());
    }

    // --- deleteItem ---------------------------------------------------------

    @Test
    @DisplayName("deleteItem() removes the item and re-numbers remaining ordinals")
    void deleteItem_renumbersRemainingOrdinals() {
        // Given — three items at ordinals 0,1,2; delete ordinal 1 (item id=11L)
        // After deleteById(), the in-memory list still contains item1 — but the
        // service treats it as gone and re-orders the remaining two (item0 keeps
        // ordinal 0, item2 is re-numbered from 2 to 1).
        TaskItem item0 = TaskItem.builder()
                .id(10L).taskId(TASK_ID).ordinal(0).title("A").completed(false).build();
        TaskItem item1 = TaskItem.builder()
                .id(11L).taskId(TASK_ID).ordinal(1).title("B").completed(false).build();
        TaskItem item2 = TaskItem.builder()
                .id(12L).taskId(TASK_ID).ordinal(2).title("C").completed(false).build();
        given(taskItemRepository.findById(11L)).willReturn(Optional.of(item1));
        // Repository after delete returns the two remaining items (A, C) with
        // their pre-delete ordinals (0, 2) — service must renumber C to 1.
        given(taskItemRepository.findByTaskIdOrderByOrdinalAsc(TASK_ID))
                .willReturn(List.of(item0, item2));
        given(taskItemRepository.save(any(TaskItem.class)))
                .willAnswer(inv -> inv.getArgument(0));

        // When
        taskService.deleteItem(TASK_ID, 11L);

        // Then — item11 was deleted; item2's ordinal was changed to 1
        then(taskItemRepository).should().deleteById(11L);
        ArgumentCaptor<TaskItem> captor = ArgumentCaptor.forClass(TaskItem.class);
        then(taskItemRepository).should(times(1)).save(captor.capture());
        TaskItem saved = captor.getValue();
        assertThat(saved.getId()).isEqualTo(12L);
        assertThat(saved.getOrdinal()).isEqualTo(1);
    }

    @Test
    @DisplayName("deleteItem() rejects an item that belongs to a different task")
    void deleteItem_rejectsCrossTaskItem() {
        // Given
        TaskItem item = TaskItem.builder()
                .id(20L).taskId(999L).ordinal(0).title("Foreign").completed(false).build();
        given(taskItemRepository.findById(20L)).willReturn(Optional.of(item));

        // When / Then
        assertThatThrownBy(() -> taskService.deleteItem(TASK_ID, 20L))
                .isInstanceOf(IllegalArgumentException.class);
        then(taskItemRepository).should(never()).deleteById(any());
    }

    // --- reorderItems -------------------------------------------------------

    @Test
    @DisplayName("reorderItems() applies the requested order to all items")
    void reorderItems_appliesRequestedOrder() {
        // Given — three items in order [A,B,C], request order [C,A,B]
        TaskItem a = TaskItem.builder().id(1L).taskId(TASK_ID).ordinal(0).title("A").build();
        TaskItem b = TaskItem.builder().id(2L).taskId(TASK_ID).ordinal(1).title("B").build();
        TaskItem c = TaskItem.builder().id(3L).taskId(TASK_ID).ordinal(2).title("C").build();
        given(taskRepository.existsById(TASK_ID)).willReturn(true);
        given(taskItemRepository.findByTaskIdOrderByOrdinalAsc(TASK_ID))
                .willReturn(List.of(a, b, c))   // initial order
                .willReturn(List.of(c, a, b));  // post-reorder (simulated)
        given(taskItemRepository.save(any(TaskItem.class)))
                .willAnswer(inv -> inv.getArgument(0));

        // When
        List<TaskItemSummary> result = taskService.reorderItems(TASK_ID, List.of(3L, 1L, 2L));

        // Then — the response carries the new order
        assertThat(result).extracting(TaskItemSummary::id)
                .containsExactly(3L, 1L, 2L);
    }

    @Test
    @DisplayName("reorderItems() rejects an item id that does not belong to the task")
    void reorderItems_rejectsForeignItemId() {
        // Given
        given(taskRepository.existsById(TASK_ID)).willReturn(true);
        TaskItem a = TaskItem.builder().id(1L).taskId(TASK_ID).ordinal(0).title("A").build();
        given(taskItemRepository.findByTaskIdOrderByOrdinalAsc(TASK_ID))
                .willReturn(List.of(a));

        // When / Then
        assertThatThrownBy(() -> taskService.reorderItems(TASK_ID, List.of(1L, 999L)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Item 999 does not belong to task");
        then(taskItemRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("reorderItems() rejects an unknown task")
    void reorderItems_rejectsUnknownTask() {
        // Given
        given(taskRepository.existsById(404L)).willReturn(false);

        // When / Then
        assertThatThrownBy(() -> taskService.reorderItems(404L, List.of(1L)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Task not found: 404");
    }

    // --- taskWithItems ------------------------------------------------------

    @Test
    @DisplayName("taskWithItems() wraps the task with its items, ordered by ordinal")
    void taskWithItems_wrapsTaskWithOrderedItems() {
        // Given
        given(taskRepository.findById(TASK_ID)).willReturn(Optional.of(existingTask));
        TaskItem a = TaskItem.builder()
                .id(1L).taskId(TASK_ID).ordinal(0).title("A").completed(false)
                .createdAt(Instant.parse("2026-06-25T10:00:00Z"))
                .build();
        TaskItem b = TaskItem.builder()
                .id(2L).taskId(TASK_ID).ordinal(1).title("B").completed(true)
                .createdAt(Instant.parse("2026-06-25T11:00:00Z"))
                .build();
        given(taskItemRepository.findByTaskIdOrderByOrdinalAsc(TASK_ID))
                .willReturn(List.of(a, b));

        // When
        Optional<TaskSummaryWithItems> result = taskService.taskWithItems(new TaskId(TASK_ID));

        // Then — the wrapper carries both summary and items
        assertThat(result).isPresent();
        TaskSummaryWithItems wrapper = result.get();
        assertThat(wrapper.base().id().value()).isEqualTo(TASK_ID);
        assertThat(wrapper.base().title()).isEqualTo("Parent");
        assertThat(wrapper.items()).hasSize(2);
        assertThat(wrapper.items().get(0).ordinal()).isEqualTo(0);
        assertThat(wrapper.items().get(1).ordinal()).isEqualTo(1);
        assertThat(wrapper.items().get(1).completed()).isTrue();
    }

    @Test
    @DisplayName("taskWithItems() returns empty when no task matches")
    void taskWithItems_returnsEmptyWhenAbsent() {
        // Given
        given(taskRepository.findById(404L)).willReturn(Optional.empty());

        // When
        Optional<TaskSummaryWithItems> result = taskService.taskWithItems(new TaskId(404L));

        // Then
        assertThat(result).isEmpty();
        then(taskItemRepository).should(never()).findByTaskIdOrderByOrdinalAsc(any());
    }

    // --- isComplete ---------------------------------------------------------

    @Test
    @DisplayName("isComplete() returns true when the task's own completed flag is set")
    void isComplete_returnsTrueWhenTaskFlagSet() {
        // Given — task.completed short-circuits before the items lookup
        existingTask.setCompleted(true);

        // When
        boolean result = taskService.isComplete(existingTask, false);

        // Then — and the items repository is never consulted
        assertThat(result).isTrue();
        then(taskItemRepository).should(never()).findByTaskIdOrderByOrdinalAsc(any());
    }

    @Test
    @DisplayName("isComplete() returns true only when all items are completed (strict mode)")
    void isComplete_strictModeRequiresAllItems() {
        // Given — task not complete, one incomplete item remains
        given(taskItemRepository.findByTaskIdOrderByOrdinalAsc(TASK_ID))
                .willReturn(List.of(
                        TaskItem.builder().id(1L).taskId(TASK_ID).ordinal(0).title("A").completed(true).build(),
                        TaskItem.builder().id(2L).taskId(TASK_ID).ordinal(1).title("B").completed(false).build()));

        // When
        boolean result = taskService.isComplete(existingTask, false);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("isComplete() returns true when any item is completed (allowPartial mode)")
    void isComplete_partialModeRequiresAnyItem() {
        // Given — task not complete, at least one item completed
        given(taskItemRepository.findByTaskIdOrderByOrdinalAsc(TASK_ID))
                .willReturn(List.of(
                        TaskItem.builder().id(1L).taskId(TASK_ID).ordinal(0).title("A").completed(true).build(),
                        TaskItem.builder().id(2L).taskId(TASK_ID).ordinal(1).title("B").completed(false).build()));

        // When
        boolean result = taskService.isComplete(existingTask, true);

        // Then
        assertThat(result).isTrue();
    }
}