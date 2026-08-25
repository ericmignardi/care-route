package com.careroute.backend.controller;

import com.careroute.backend.dto.CarePlanTaskRequest;
import com.careroute.backend.dto.CarePlanTaskResponse;
import com.careroute.backend.dto.ClientDetailResponse;
import com.careroute.backend.dto.ClientRequest;
import com.careroute.backend.dto.ClientResponse;
import com.careroute.backend.dto.PageResponse;
import com.careroute.backend.model.ClientStatus;
import com.careroute.backend.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * FR-2.x. Coordinators and admins only — caregivers reach client details through their own
 * visits, never through the client directory.
 */
@RestController
@RequestMapping("/api/v1/clients")
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @GetMapping
    public PageResponse<ClientResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ClientStatus status,
            @PageableDefault(size = 20, sort = "lastName", direction = Sort.Direction.ASC) Pageable pageable) {
        return clientService.findAll(search, status, pageable);
    }

    @GetMapping("/{id}")
    public ClientDetailResponse get(@PathVariable UUID id) {
        return clientService.findById(id);
    }

    @PostMapping
    public ResponseEntity<ClientResponse> create(@Valid @RequestBody ClientRequest request) {
        ClientResponse created = clientService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ClientResponse update(@PathVariable UUID id, @Valid @RequestBody ClientRequest request) {
        return clientService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID id) {
        clientService.deactivate(id);
    }

    @GetMapping("/{id}/care-plan-tasks")
    public List<CarePlanTaskResponse> carePlanTasks(@PathVariable UUID id) {
        return clientService.findCarePlanTasks(id);
    }

    @PostMapping("/{id}/care-plan-tasks")
    public ResponseEntity<CarePlanTaskResponse> addCarePlanTask(@PathVariable UUID id,
                                                                @Valid @RequestBody CarePlanTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.addCarePlanTask(id, request));
    }

    @DeleteMapping("/{id}/care-plan-tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeCarePlanTask(@PathVariable UUID id, @PathVariable UUID taskId) {
        clientService.removeCarePlanTask(id, taskId);
    }
}
