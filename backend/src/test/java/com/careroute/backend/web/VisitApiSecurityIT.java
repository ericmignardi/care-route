package com.careroute.backend.web;

import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.User;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization over HTTP, through the real filter chain and real JWTs.
 *
 * <p>BR-7 is why this class exists: "own only" cannot be expressed as a role, so it is
 * enforced after the row is loaded — and the only way to know it holds is to ask the API as
 * one caregiver for another caregiver's visit.
 */
class VisitApiSecurityIT extends AbstractIntegrationTest {

    private Client client;
    private Caregiver nadia;
    private Caregiver pavel;
    private Visit nadiasVisit;
    private String nadiasToken;
    private String pavelsToken;
    private String coordinatorToken;

    @BeforeEach
    void createAccountsAndAVisit() {
        client = persistClient("Okonkwo");
        nadia = persistCaregiver("nadia", Skill.NURSING);
        pavel = persistCaregiver("pavel", Skill.NURSING);
        User coordinator = persistUser("coordinator", "ROLE_COORDINATOR");

        nadiasVisit = persistVisit(client, nadia, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        nadiasToken = tokenFor(nadia);
        pavelsToken = tokenFor(pavel);
        coordinatorToken = tokenFor(coordinator);
    }

    // --- authentication -----------------------------------------------------

    @Test
    @DisplayName("an unauthenticated request is rejected with 401 as problem+json")
    void anUnauthenticatedRequestIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/v1/visits"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Unauthorized"));
    }

    @Test
    @DisplayName("a forged token is rejected with 401 rather than trusted")
    void aForgedTokenIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/v1/visits").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    // --- role gates ---------------------------------------------------------

    @Test
    @DisplayName("a caregiver is forbidden from the client directory")
    void aCaregiverIsForbiddenFromTheClientDirectory() throws Exception {
        mockMvc.perform(get("/api/v1/clients").header("Authorization", bearer(nadiasToken)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    @DisplayName("a caregiver cannot schedule visits")
    void aCaregiverCannotScheduleVisits() throws Exception {
        mockMvc.perform(post("/api/v1/visits")
                        .header("Authorization", bearer(nadiasToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scheduleBody(client, nadia, "10:00", "11:00")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("a coordinator can list visits")
    void aCoordinatorCanListVisits() throws Exception {
        mockMvc.perform(get("/api/v1/visits").header("Authorization", bearer(coordinatorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    // --- BR-7 ---------------------------------------------------------------

    @Test
    @DisplayName("BR-7: a caregiver can read their own visit")
    void br7_aCaregiverCanReadTheirOwnVisit() throws Exception {
        mockMvc.perform(get("/api/v1/visits/" + nadiasVisit.getId())
                        .header("Authorization", bearer(nadiasToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(nadiasVisit.getId().toString()));
    }

    @Test
    @DisplayName("BR-7: a caregiver cannot read another caregiver's visit")
    void br7_aCaregiverCannotReadAnotherCaregiversVisit() throws Exception {
        mockMvc.perform(get("/api/v1/visits/" + nadiasVisit.getId())
                        .header("Authorization", bearer(pavelsToken)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    @DisplayName("BR-7: a caregiver cannot check into another caregiver's visit")
    void br7_aCaregiverCannotCheckIntoAnotherCaregiversVisit() throws Exception {
        clock.setNow(at(10, 0));

        mockMvc.perform(post("/api/v1/visits/" + nadiasVisit.getId() + "/check-in")
                        .header("Authorization", bearer(pavelsToken)))
                .andExpect(status().isForbidden());

        assertVisitIsStill(VisitStatus.SCHEDULED);
    }

    @Test
    @DisplayName("BR-7: the assigned caregiver can check in")
    void br7_theAssignedCaregiverCanCheckIn() throws Exception {
        clock.setNow(at(10, 0));

        mockMvc.perform(post("/api/v1/visits/" + nadiasVisit.getId() + "/check-in")
                        .header("Authorization", bearer(nadiasToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    /**
     * A coordinator may see any visit, but check-in is the caregiver's evidence that they
     * were in the client's home, so nobody else can produce it.
     */
    @Test
    @DisplayName("BR-7: a coordinator can read any visit but cannot check into one")
    void br7_aCoordinatorCanReadAnyVisitButCannotCheckIntoIt() throws Exception {
        clock.setNow(at(10, 0));

        mockMvc.perform(get("/api/v1/visits/" + nadiasVisit.getId())
                        .header("Authorization", bearer(coordinatorToken)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/visits/" + nadiasVisit.getId() + "/check-in")
                        .header("Authorization", bearer(coordinatorToken)))
                .andExpect(status().isForbidden());

        assertVisitIsStill(VisitStatus.SCHEDULED);
    }

    // --- the wire contract for rule failures --------------------------------

    @Test
    @DisplayName("BR-1: an overlapping visit is 409 and names the rule in the body")
    void br1_anOverlappingVisitIs409WithTheRule() throws Exception {
        mockMvc.perform(post("/api/v1/visits")
                        .header("Authorization", bearer(coordinatorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scheduleBody(client, nadia, "10:30", "11:30")))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.rule").value("CAREGIVER_DOUBLE_BOOKED"))
                .andExpect(jsonPath("$.detail").value("Booked 10:00-11:00"));
    }

    @Test
    @DisplayName("BR-3: a caregiver without the required skill is 422 and names the rule")
    void br3_aCaregiverWithoutTheRequiredSkillIs422WithTheRule() throws Exception {
        Caregiver unskilled = persistCaregiver("sam", Skill.PERSONAL_SUPPORT);

        mockMvc.perform(post("/api/v1/visits")
                        .header("Authorization", bearer(coordinatorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scheduleBody(client, unskilled, "13:00", "14:00")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.rule").value("CAREGIVER_MISSING_SKILL"))
                .andExpect(jsonPath("$.detail").value("Missing: NURSING"));
    }

    @Test
    @DisplayName("BR-6: cancelling a completed visit is 409")
    void br6_cancellingACompletedVisitIs409() throws Exception {
        Visit completed = persistVisit(client, pavel, at(13, 0), at(14, 0), Skill.NURSING, VisitStatus.COMPLETED);

        mockMvc.perform(post("/api/v1/visits/" + completed.getId() + "/cancel")
                        .header("Authorization", bearer(coordinatorToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.rule").value("ILLEGAL_STATUS_TRANSITION"));
    }

    @Test
    @DisplayName("a validation failure keeps the field-error map")
    void aValidationFailureKeepsTheFieldErrorMap() throws Exception {
        mockMvc.perform(post("/api/v1/visits")
                        .header("Authorization", bearer(coordinatorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.clientId").exists())
                .andExpect(jsonPath("$.errors.requiredSkill").exists());
    }

    private void assertVisitIsStill(VisitStatus status) {
        assertThat(visitRepository.findById(nadiasVisit.getId()).orElseThrow().getStatus()).isEqualTo(status);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private String scheduleBody(Client client, Caregiver caregiver, String from, String to) {
        return """
                {
                  "clientId": "%s",
                  "caregiverId": "%s",
                  "scheduledStart": "%sT%s:00",
                  "scheduledEnd": "%sT%s:00",
                  "requiredSkill": "NURSING"
                }
                """.formatted(client.getId(), caregiver.getId(), DAY, from, DAY, to);
    }
}
