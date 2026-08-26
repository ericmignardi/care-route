package com.careroute.backend.service;

import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * BR-8 — two coordinators editing the same visit. Not a thread race: both load the visit,
 * both act, and the second acts on a copy the first has already superseded. {@code @Version}
 * on {@link Visit} turns that into a rejection instead of a silently lost update.
 */
class VisitConcurrencyIT extends AbstractIntegrationTest {

    private Client client;
    private Caregiver caregiver;

    @BeforeEach
    void createFixture() {
        client = persistClient("Okonkwo");
        caregiver = persistCaregiver("nadia", Skill.NURSING);
    }

    @Test
    @DisplayName("BR-8: the second writer of a stale visit is rejected, not silently applied")
    void br8_theSecondWriterOfAStaleVisitIsRejected() {
        Visit saved = persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        // Both coordinators open the same visit.
        Visit firstCoordinatorsCopy = visitRepository.findById(saved.getId()).orElseThrow();
        Visit secondCoordinatorsCopy = visitRepository.findById(saved.getId()).orElseThrow();
        assertThat(firstCoordinatorsCopy.getVersion()).isEqualTo(secondCoordinatorsCopy.getVersion());

        // The first one saves.
        firstCoordinatorsCopy.setNotes("Front door code is 4821");
        visitRepository.saveAndFlush(firstCoordinatorsCopy);

        // The second one saves a copy that no longer reflects the row.
        secondCoordinatorsCopy.setNotes("Use the side entrance");
        assertThatThrownBy(() -> visitRepository.saveAndFlush(secondCoordinatorsCopy))
                .isInstanceOf(OptimisticLockingFailureException.class);

        assertThat(visitRepository.findById(saved.getId()).orElseThrow().getNotes())
                .isEqualTo("Front door code is 4821");
    }

    @Test
    @DisplayName("BR-8: the version a client round-trips advances on every write")
    void br8_theVersionAdvancesOnEveryWrite() {
        Visit saved = persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);
        int initialVersion = saved.getVersion();

        Visit reloaded = visitRepository.findById(saved.getId()).orElseThrow();
        reloaded.setNotes("Ring twice");
        visitRepository.saveAndFlush(reloaded);

        assertThat(visitRepository.findById(saved.getId()).orElseThrow().getVersion())
                .isEqualTo(initialVersion + 1);
    }
}
